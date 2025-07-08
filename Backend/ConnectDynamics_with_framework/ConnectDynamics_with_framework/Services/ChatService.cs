using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Services.Interfaces;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.ServiceModel;
using System.Threading.Tasks;
using log4net;
using System.IO;
using ConnectDynamics_with_framework.Hubs;
using Microsoft.AspNet.SignalR;

namespace ConnectDynamics_with_framework.Services
{
    public class ChatService : IChatService
    {
        private static readonly ILog log = LogManager.GetLogger(typeof(ChatService));

        private readonly CrmServiceProvider _crmServiceProvider;
        private readonly IDatabase _redisDatabase;

        public ChatService(CrmServiceProvider crmServiceProvider, IDatabase redisDatabase)
        {
            _crmServiceProvider = crmServiceProvider;
            _redisDatabase = redisDatabase;
        }

        public async Task<Guid> AddChatMessage(ChatMessageDto chatMessageDto)
        {
            // Add extensive logging
            log.Info($"AddChatMessage called with: FromUserId={chatMessageDto.FromUserId}, ToUserId={chatMessageDto.ToUserId}, Message={chatMessageDto.Message}");

            try
            {
                // Check Redis session
                var sessionExists = await _redisDatabase.KeyExistsAsync($"sessions:{chatMessageDto.FromUserId}");
                log.Info($"Session check for {chatMessageDto.FromUserId}: {sessionExists}");

                if (!sessionExists)
                {
                    log.Warn($"Unauthorized access attempt by user {chatMessageDto.FromUserId}");
                    throw new UnauthorizedAccessException("User not authenticated");
                }

                using (var service = _crmServiceProvider.GetService())
                {
                    try
                    {
                        // Validate input parameters
                        if (chatMessageDto.FromUserId == Guid.Empty || chatMessageDto.ToUserId == Guid.Empty)
                        {
                            log.Error("Invalid user IDs in chat message");
                            throw new ArgumentException("Invalid user IDs");
                        }

                        if (string.IsNullOrWhiteSpace(chatMessageDto.Message))
                        {
                            log.Error("Empty message content");
                            throw new ArgumentException("Message cannot be empty");
                        }

                        log.Info($"Retrieving user details for {chatMessageDto.FromUserId} and {chatMessageDto.ToUserId}");

                        // Retrieve user details with error handling
                        Entity fromUser = null;
                        Entity toUser = null;

                        try
                        {
                            fromUser = service.Retrieve("systemuser", chatMessageDto.FromUserId, new ColumnSet("fullname"));
                            log.Info($"Retrieved fromUser: {fromUser?.Id}");
                        }
                        catch (Exception ex)
                        {
                            log.Error($"Failed to retrieve fromUser: {ex.Message}", ex);
                        }

                        try
                        {
                            toUser = service.Retrieve("systemuser", chatMessageDto.ToUserId, new ColumnSet("fullname"));
                            log.Info($"Retrieved toUser: {toUser?.Id}");
                        }
                        catch (Exception ex)
                        {
                            log.Error($"Failed to retrieve toUser: {ex.Message}", ex);
                        }

                        if (fromUser == null || toUser == null)
                        {
                            log.Error($"User not found - From: {fromUser == null}, To: {toUser == null}");
                            throw new Exception("One or both users not found in CRM");
                        }

                        // Create a valid name for the message (required field)
                        string messageName = $"Chat: {fromUser.GetAttributeValue<string>("fullname")} to {toUser.GetAttributeValue<string>("fullname")} - {DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")}";
                        log.Info($"Generated message name: {messageName}");

                        // Create the entity with all required fields
                        var chatMessage = new Entity("cr9bc_chatmessage");

                        // Add attributes one by one with logging
                        try
                        {
                            chatMessage["cr9bc_fromuser"] = new EntityReference("systemuser", chatMessageDto.FromUserId);
                            chatMessage["cr9bc_touser"] = new EntityReference("systemuser", chatMessageDto.ToUserId);
                            chatMessage["cr9bc_message"] = chatMessageDto.Message;
                            chatMessage["cr9bc_timestamp"] = DateTime.UtcNow;
                            chatMessage["cr9bc_isread"] = false;
                            chatMessage["cr9bc_name"] = messageName;

                            log.Info("Entity created with all required attributes");
                        }
                        catch (Exception ex)
                        {
                            log.Error($"Error setting entity attributes: {ex.Message}", ex);
                            throw;
                        }

                        // Log the complete entity
                        log.Info($"Attempting to create chat message with attributes: {string.Join(", ", chatMessage.Attributes.Select(a => $"{a.Key}={a.Value}"))}");

                        // Create the record with explicit error handling
                        Guid messageId;
                        try
                        {
                            messageId = service.Create(chatMessage);
                            log.Info($"Chat message created successfully with ID: {messageId}");
                        }
                        catch (FaultException<OrganizationServiceFault> ex)
                        {
                            log.Error($"CRM FaultException during Create: {ex.Detail.Message}", ex);
                            throw new Exception($"CRM Service Error: {ex.Detail.Message}", ex);
                        }
                        catch (Exception ex)
                        {
                            log.Error($"Unexpected error during Create: {ex.Message}", ex);
                            throw;
                        }

                        // Verify the message was created
                        try
                        {
                            var createdMessage = service.Retrieve("cr9bc_chatmessage", messageId, new ColumnSet("cr9bc_message"));
                            log.Info($"Verified message exists: {createdMessage.Id}");
                        }
                        catch (Exception ex)
                        {
                            log.Error($"Failed to verify message creation: {ex.Message}", ex);
                            // Continue anyway since the message ID was returned
                        }

                        return messageId;
                    }
                    catch (Exception ex)
                    {
                        log.Error($"Error in AddChatMessage inner block: {ex.Message}", ex);
                        throw;
                    }
                }
            }
            catch (Exception ex)
            {
                log.Error($"Error in AddChatMessage outer block: {ex.Message}", ex);
                throw;
            }
        }

        public async Task<bool> VerifyMessageExists(Guid messageId)
        {
            return await Task.Run(() =>
            {
                using (var service = _crmServiceProvider.GetService())
                {
                    try
                    {
                        log.Info($"Verifying message exists in CRM: {messageId}");
                        var message = service.Retrieve("cr9bc_chatmessage", messageId, new ColumnSet("cr9bc_chatmessageid"));
                        if (message == null)
                        {
                            log.Warn($"Message not found in CRM: {messageId}");
                            return false;
                        }
                        log.Info($"Message verified in CRM: {messageId}");
                        return true;
                    }
                    catch (Exception ex)
                    {
                        log.Error($"Error verifying message {messageId}", ex);
                        return false;
                    }
                }
            });
        }

        public async Task<List<ChatMessageDto>> GetMessagesBetweenUsers(Guid userId1, Guid userId2)
        {
            using (var service = _crmServiceProvider.GetService())
            {
                try
                {
                    log.Info($"Retrieving messages between {userId1} and {userId2}");

                    var query = new QueryExpression("cr9bc_chatmessage")
                    {
                        // Inclure tous les champs nécessaires, y compris l'ID du message
                        ColumnSet = new ColumnSet("cr9bc_chatmessageid", "cr9bc_fromuser", "cr9bc_touser", "cr9bc_message",
                            "cr9bc_timestamp", "cr9bc_isread", "cr9bc_name",
                            "cr9bc_hasattachment", "cr9bc_attachmenttype", "cr9bc_attachmentname",
                            "cr9bc_attachmenturl", "cr9bc_attachmentsize"),

                        Criteria = new FilterExpression(LogicalOperator.And)
                        {
                            Filters =
                    {
                        new FilterExpression(LogicalOperator.Or)
                        {
                            Filters =
                            {
                                new FilterExpression(LogicalOperator.And)
                                {
                                    Conditions =
                                    {
                                        new ConditionExpression("cr9bc_fromuser", ConditionOperator.Equal, userId1),
                                        new ConditionExpression("cr9bc_touser", ConditionOperator.Equal, userId2)
                                    }
                                },
                                new FilterExpression(LogicalOperator.And)
                                {
                                    Conditions =
                                    {
                                        new ConditionExpression("cr9bc_fromuser", ConditionOperator.Equal, userId2),
                                        new ConditionExpression("cr9bc_touser", ConditionOperator.Equal, userId1)
                                    }
                                }
                            }
                        }
                    }
                        },
                        Orders = { new OrderExpression("cr9bc_timestamp", OrderType.Ascending) }
                    };

                    var messages = await Task.Run(() => service.RetrieveMultiple(query).Entities);
                    log.Info($"Retrieved {messages.Count} messages between {userId1} and {userId2}");

                    var result = new List<ChatMessageDto>();

                    foreach (var m in messages)
                    {
                        // Créer le DTO avec l'ID correct du message
                        var messageDto = new ChatMessageDto
                        {
                            Id = m.Id, // Utiliser l'ID principal de l'entité
                            FromUserId = m.GetAttributeValue<EntityReference>("cr9bc_fromuser").Id,
                            ToUserId = m.GetAttributeValue<EntityReference>("cr9bc_touser").Id,
                            Message = m.GetAttributeValue<string>("cr9bc_message"),
                            Timestamp = m.GetAttributeValue<DateTime>("cr9bc_timestamp"),
                            IsRead = m.GetAttributeValue<bool>("cr9bc_isread"),
                            Name = m.GetAttributeValue<string>("cr9bc_name"),

                            // Propriétés d'attachement avec vérification null
                            HasAttachment = m.Contains("cr9bc_hasattachment") ? m.GetAttributeValue<bool>("cr9bc_hasattachment") : false
                        };

                        // Gérer le type d'attachement (option set)
                        if (m.Contains("cr9bc_attachmenttype") && m.GetAttributeValue<OptionSetValue>("cr9bc_attachmenttype") != null)
                        {
                            messageDto.AttachmentType = m.GetAttributeValue<OptionSetValue>("cr9bc_attachmenttype").Value.ToString();
                        }

                        // Gérer les autres propriétés d'attachement
                        if (m.Contains("cr9bc_attachmentname"))
                        {
                            messageDto.AttachmentName = m.GetAttributeValue<string>("cr9bc_attachmentname");
                        }

                        if (m.Contains("cr9bc_attachmenturl"))
                        {
                            messageDto.AttachmentUrl = m.GetAttributeValue<string>("cr9bc_attachmenturl");
                        }

                        if (m.Contains("cr9bc_attachmentsize"))
                        {
                            messageDto.AttachmentSize = m.GetAttributeValue<int>("cr9bc_attachmentsize");
                        }

                        // Log pour déboguer
                        log.Info($"Message ID: {messageDto.Id}, HasAttachment: {messageDto.HasAttachment}, AttachmentName: {messageDto.AttachmentName}");

                        result.Add(messageDto);
                    }

                    return result;
                }
                catch (Exception ex)
                {
                    log.Error("Error while retrieving messages", ex);
                    throw;
                }
            }
        }
        public async Task MarkMessagesAsRead(List<Guid> messageIds)
        {
            if (messageIds == null || messageIds.Count == 0)
            {
                log.Warn("MarkMessagesAsRead called with empty messageIds");
                return;
            }

            using (var service = _crmServiceProvider.GetService())
            {
                await Task.Run(() =>
                {
                    foreach (var messageId in messageIds)
                    {
                        try
                        {
                            log.Info($"Marking message as read: {messageId}");
                            var message = new Entity("cr9bc_chatmessage", messageId);
                            message["cr9bc_isread"] = true;
                            service.Update(message);
                            log.Info($"Message marked as read: {messageId}");
                        }
                        catch (Exception ex)
                        {
                            log.Error($"Failed to mark message as read: {messageId}", ex);
                        }
                    }
                });
            }
        }

        public async Task<List<Guid>> GetUnreadMessages(Guid userId)
        {
            using (var service = _crmServiceProvider.GetService())
            {
                try
                {
                    log.Info($"Getting unread messages for user {userId}");

                    var query = new QueryExpression("cr9bc_chatmessage")
                    {
                        ColumnSet = new ColumnSet("cr9bc_chatmessageid"),
                        Criteria = new FilterExpression
                        {
                            Conditions =
                            {
                                new ConditionExpression("cr9bc_touser", ConditionOperator.Equal, userId),
                                new ConditionExpression("cr9bc_isread", ConditionOperator.Equal, false)
                            }
                        }
                    };

                    var result = service.RetrieveMultiple(query).Entities
                        .Select(e => e.Id)
                        .ToList();

                    log.Info($"Found {result.Count} unread messages for user {userId}");

                    return await Task.FromResult(result);
                }
                catch (Exception ex)
                {
                    log.Error("Error while retrieving unread messages", ex);
                    throw;
                }
            }
        }

        public async Task<List<EmployeeDto>> GetChatContacts(Guid userId)
        {
            using (var service = _crmServiceProvider.GetService())
            {
                try
                {
                    log.Info($"Getting chat contacts for user {userId}");

                    var query = new QueryExpression("systemuser")
                    {
                        ColumnSet = new ColumnSet("fullname", "domainname", "photourl", "title", "address1_line1",
                                                   "address1_city", "address1_postalcode", "address1_country",
                                                   "mobilephone", "isdisabled"),
                        Criteria = new FilterExpression
                        {
                            Conditions =
                            {
                                new ConditionExpression("systemuserid", ConditionOperator.NotEqual, userId),
                                new ConditionExpression("isdisabled", ConditionOperator.Equal, false)
                            }
                        }
                    };

                    var users = service.RetrieveMultiple(query).Entities;
                    log.Info($"Retrieved {users.Count} contacts excluding user {userId}");

                    return await Task.FromResult(users
                        .Select(u => new EmployeeDto
                        {
                            UserId = u.Id,
                            FullName = u.GetAttributeValue<string>("fullname"),
                            Email = u.GetAttributeValue<string>("domainname"),
                            Photo = u.GetAttributeValue<string>("photourl"),
                            IsConnected = _redisDatabase.KeyExists($"sessions:{u.Id}"),
                            Title = u.GetAttributeValue<string>("title"),
                            Address = u.GetAttributeValue<string>("address1_line1"),
                            City = u.GetAttributeValue<string>("address1_city"),
                            PostalCode = u.GetAttributeValue<string>("address1_postalcode"),
                            Country = u.GetAttributeValue<string>("address1_country"),
                            PhoneNumber = u.GetAttributeValue<string>("mobilephone")
                        })
                        .ToList());
                }
                catch (Exception ex)
                {
                    log.Error("Error while retrieving chat contacts", ex);
                    throw;
                }
            }


        }
        public async Task<Guid> AddChatMessageWithAttachment(ChatMessageDto chatMessageDto, byte[] fileData)
        {
            log.Info($"AddChatMessageWithAttachment called with: FromUserId={chatMessageDto.FromUserId}, ToUserId={chatMessageDto.ToUserId}, AttachmentName={chatMessageDto.AttachmentName}, FileSize={fileData?.Length ?? 0}");

            try
            {
                // Check Redis session
                var sessionExists = await _redisDatabase.KeyExistsAsync($"sessions:{chatMessageDto.FromUserId}");
                if (!sessionExists)
                {
                    log.Warn($"Unauthorized access attempt by user {chatMessageDto.FromUserId}");
                    throw new UnauthorizedAccessException("User not authenticated");
                }

                using (var service = _crmServiceProvider.GetService())
                {
                    try
                    {
                        // Create the chat message entity
                        var chatMessage = new Entity("cr9bc_chatmessage");
                        chatMessage["cr9bc_fromuser"] = new EntityReference("systemuser", chatMessageDto.FromUserId);
                        chatMessage["cr9bc_touser"] = new EntityReference("systemuser", chatMessageDto.ToUserId);
                        chatMessage["cr9bc_message"] = chatMessageDto.Message;
                        chatMessage["cr9bc_timestamp"] = DateTime.UtcNow;
                        chatMessage["cr9bc_isread"] = false;
                        chatMessage["cr9bc_name"] = chatMessageDto.Name;

                        // Add attachment info
                        chatMessage["cr9bc_hasattachment"] = true;

                        // Handle the option set value for attachment type
                        chatMessage["cr9bc_hasattachment"] = true;

                        // Déterminer le type d'attachement basé sur le nom de fichier
                        int attachmentTypeValue = DetermineFileType(chatMessageDto.AttachmentName);
                        log.Info($"Determined attachment type for {chatMessageDto.AttachmentName}: {attachmentTypeValue}");
                        chatMessage["cr9bc_attachmenttype"] = new OptionSetValue(attachmentTypeValue);

                        if (!string.IsNullOrEmpty(chatMessageDto.AttachmentName))
                        {
                            chatMessage["cr9bc_attachmentname"] = chatMessageDto.AttachmentName;
                        }
                        else
                        {
                            // Default to "Other" if no attachment type is provided
                            log.Info("No attachment type provided, using default value");
                            chatMessage["cr9bc_attachmenttype"] = new OptionSetValue(3);
                        }

                        if (!string.IsNullOrEmpty(chatMessageDto.AttachmentName))
                        {
                            chatMessage["cr9bc_attachmentname"] = chatMessageDto.AttachmentName;
                        }

                        // Make sure AttachmentSize is an integer
                        chatMessage["cr9bc_attachmentsize"] = chatMessageDto.AttachmentSize;

                        log.Info($"Creating chat message entity with attachment info");

                        // Create the message
                        Guid messageId = service.Create(chatMessage);
                        log.Info($"Chat message created with ID: {messageId}");

                        // Create annotation (attachment)
                        Entity annotation = new Entity("annotation");
                        annotation["objectid"] = new EntityReference("cr9bc_chatmessage", messageId);
                        annotation["objecttypecode"] = "cr9bc_chatmessage";
                        annotation["subject"] = chatMessageDto.AttachmentName ?? "Attachment";

                        // Convert byte array to Base64 string for documentbody
                        annotation["documentbody"] = Convert.ToBase64String(fileData);

                        // Set mimetype based on file extension
                        annotation["mimetype"] = GetMimeType(chatMessageDto.AttachmentName ?? "");
                        annotation["filename"] = chatMessageDto.AttachmentName ?? "attachment";

                        log.Info($"Creating annotation for attachment: {chatMessageDto.AttachmentName}, Size: {fileData.Length} bytes");
                        Guid annotationId = service.Create(annotation);
                        log.Info($"Annotation created with ID: {annotationId}");

                        // Update the message with the attachment URL
                        Entity updateMessage = new Entity("cr9bc_chatmessage", messageId);
                        updateMessage["cr9bc_attachmenturl"] = $"/api/chat/attachment/{messageId}";
                        service.Update(updateMessage);
                        log.Info($"Updated message with attachment URL: {messageId}");

                        return messageId;
                    }
                    catch (FaultException<OrganizationServiceFault> crmEx)
                    {
                        log.Error($"CRM Service Fault: {crmEx.Detail.Message}", crmEx);
                        if (crmEx.Detail.ErrorDetails != null && crmEx.Detail.ErrorDetails.Count > 0)
                        {
                            foreach (var detail in crmEx.Detail.ErrorDetails)
                            {
                                log.Error($"Error Detail: {detail.Key} = {detail.Value}");
                            }
                        }
                        throw new Exception($"CRM Service Error: {crmEx.Detail.Message}", crmEx);
                    }
                    catch (Exception ex)
                    {
                        log.Error($"Error in CRM operations: {ex.Message}", ex);
                        throw;
                    }
                }
            }
            catch (Exception ex)
            {
                log.Error($"Error in AddChatMessageWithAttachment: {ex.Message}", ex);
                throw;
            }
        }
        public async Task<byte[]> GetAttachmentData(Guid messageId)
        {
            using (var service = _crmServiceProvider.GetService())
            {
                try
                {
                    // Use Task.Run to make the synchronous CRM operation run on a background thread
                    return await Task.Run(() => {
                        // Query for annotations related to this message
                        QueryExpression query = new QueryExpression("annotation");
                        query.ColumnSet = new ColumnSet("documentbody", "filename", "mimetype");
                        query.Criteria.AddCondition("objectid", ConditionOperator.Equal, messageId);
                        query.Criteria.AddCondition("objecttypecode", ConditionOperator.Equal, "cr9bc_chatmessage");

                        EntityCollection results = service.RetrieveMultiple(query);

                        if (results.Entities.Count > 0)
                        {
                            Entity annotation = results.Entities[0];
                            string base64Data = annotation.GetAttributeValue<string>("documentbody");
                            return Convert.FromBase64String(base64Data);
                        }

                        return null;
                    });
                }
                catch (Exception ex)
                {
                    log.Error($"Error retrieving attachment: {ex.Message}", ex);
                    throw;
                }
            }
        }
        private string GetMimeType(string fileName)
        {
            string extension = Path.GetExtension(fileName).ToLowerInvariant();
            switch (extension)
            {
                case ".jpg":
                case ".jpeg":
                    return "image/jpeg";
                case ".png":
                    return "image/png";
                case ".gif":
                    return "image/gif";
                case ".pdf":
                    return "application/pdf";
                case ".doc":
                case ".docx":
                    return "application/msword";
                case ".xls":
                case ".xlsx":
                    return "application/vnd.ms-excel";
                default:
                    return "application/octet-stream";
            }
        }

        public async Task<ChatMessageDto> GetMessageById(Guid messageId)
        {
            log.Info($"GetMessageById called with: messageId={messageId}");

            try
            {
                using (var service = _crmServiceProvider.GetService())
                {
                    if (service == null)
                    {
                        log.Error("CRM Service is null");
                        return null;
                    }

                    var entity = service.Retrieve(
                        "cr9bc_chatmessage",
                        messageId,
                        new ColumnSet(
                            "cr9bc_fromuser",
                            "cr9bc_touser",
                            "cr9bc_message",
                            "cr9bc_timestamp",
                            "cr9bc_isread",
                            "cr9bc_name",
                            "cr9bc_hasattachment",
                            "cr9bc_attachmenttype",
                            "cr9bc_attachmentname",
                            "cr9bc_attachmenturl",
                            "cr9bc_attachmentsize"
                        ));

                    if (entity == null)
                    {
                        log.Warn($"Message with ID {messageId} not found in CRM");
                        return null;
                    }

                    var fromUserRef = entity.GetAttributeValue<EntityReference>("cr9bc_fromuser");
                    var toUserRef = entity.GetAttributeValue<EntityReference>("cr9bc_touser");

                    if (fromUserRef == null || toUserRef == null)
                    {
                        log.Warn($"Message {messageId} is missing user references");
                        return null;
                    }

                    string attachmentType = "3"; // Valeur par défaut (Other)
                    var attachmentTypeOption = entity.GetAttributeValue<OptionSetValue>("cr9bc_attachmenttype");
                    if (attachmentTypeOption != null)
                    {
                        attachmentType = attachmentTypeOption.Value.ToString();
                    }

                    return new ChatMessageDto
                    {
                        Id = entity.Id,
                        FromUserId = fromUserRef.Id,
                        ToUserId = toUserRef.Id,
                        Message = entity.GetAttributeValue<string>("cr9bc_message"),
                        Timestamp = entity.GetAttributeValue<DateTime>("cr9bc_timestamp"),
                        IsRead = entity.GetAttributeValue<bool>("cr9bc_isread"),
                        Name = entity.GetAttributeValue<string>("cr9bc_name"),
                        HasAttachment = entity.GetAttributeValue<bool>("cr9bc_hasattachment"),
                        AttachmentType = attachmentType,
                        AttachmentName = entity.GetAttributeValue<string>("cr9bc_attachmentname"),
                        AttachmentUrl = entity.GetAttributeValue<string>("cr9bc_attachmenturl"),
                        AttachmentSize = entity.GetAttributeValue<int>("cr9bc_attachmentsize")
                    };
                }
            }
            catch (Exception ex)
            {
                log.Error($"Error retrieving message {messageId}", ex);
                return null;
            }
        }
        private int DetermineFileType(string fileName)
        {
            if (string.IsNullOrEmpty(fileName))
                return 3; // Other

            string extension = Path.GetExtension(fileName).ToLowerInvariant();

            // Images
            if (new[] { ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg" }.Contains(extension))
                return 1; // Image

            // Documents
            if (new[] { ".pdf", ".doc", ".docx", ".txt", ".rtf", ".xls", ".xlsx", ".ppt", ".pptx" }.Contains(extension))
                return 2; // Document

            // Par défaut
            return 3; // Other
        }

        private void NotifyClientsAboutFileUpload(Guid fromUserId, Guid toUserId, Guid messageId, string fileName)
        {
            try
            {
                var hubContext = GlobalHost.ConnectionManager.GetHubContext<ChatHub>();

                // Appeler la méthode du hub
                hubContext.Clients.All.notifyFileUploadComplete(
                    fromUserId.ToString(),
                    toUserId.ToString(),
                    messageId.ToString(),
                    fileName
                );

                System.Diagnostics.Debug.WriteLine($"Direct SignalR notification sent for message: {messageId}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error sending direct SignalR notification: {ex.Message}");
            }
        }

    }

}