using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Services.Interfaces;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ConnectDynamics_with_framework.Services
{
    public class ChatService : IChatService
    {
        private readonly CrmServiceProvider _crmServiceProvider;
        private readonly IDatabase _redisDatabase;

        public ChatService(CrmServiceProvider crmServiceProvider, IDatabase redisDatabase)
        {
            _crmServiceProvider = crmServiceProvider;
            _redisDatabase = redisDatabase;
        }

        public async Task<Guid> AddChatMessage(ChatMessageDto chatMessageDto)
        {
            if (!await _redisDatabase.KeyExistsAsync($"sessions:{chatMessageDto.FromUserId}"))
            {
                throw new UnauthorizedAccessException("User not authenticated");
            }

            using (var service = _crmServiceProvider.GetService())
            {
                var chatMessage = new Entity("cr9bc_chatmessage");
                chatMessage["cr9bc_fromuser"] = new EntityReference("systemuser", chatMessageDto.FromUserId);
                chatMessage["cr9bc_touser"] = new EntityReference("systemuser", chatMessageDto.ToUserId);
                chatMessage["cr9bc_message"] = chatMessageDto.Message;
                chatMessage["cr9bc_timestamp"] = DateTime.UtcNow; // Utiliser toujours le temps actuel
                chatMessage["cr9bc_isread"] = chatMessageDto.IsRead;
                chatMessage["cr9bc_name"] = string.IsNullOrEmpty(chatMessageDto.Name)
                    ? $"Message {DateTime.UtcNow.ToString("yyyyMMddHHmmss")}"
                    : chatMessageDto.Name;

                var messageId = service.Create(chatMessage);

                // Vérification que le message est bien créé
                var createdMessage = service.Retrieve("cr9bc_chatmessage", messageId, new ColumnSet(true));
                if (createdMessage == null)
                {
                    throw new Exception("Failed to create chat message in CRM");
                }

                return messageId;
            }
        }

        public async Task<List<ChatMessageDto>> GetMessagesBetweenUsers(Guid userId1, Guid userId2)
        {
            using (var service = _crmServiceProvider.GetService())
            {
                var query = new QueryExpression("cr9bc_chatmessage")
                {
                    ColumnSet = new ColumnSet("cr9bc_fromuser", "cr9bc_touser", "cr9bc_message",
                                            "cr9bc_timestamp", "cr9bc_isread", "cr9bc_name"),
                    Criteria = new FilterExpression(LogicalOperator.Or)
                    {
                        Conditions =
                {
                    // Messages de userId1 à userId2
                    new ConditionExpression("cr9bc_fromuser", ConditionOperator.Equal, userId1),
                    new ConditionExpression("cr9bc_touser", ConditionOperator.Equal, userId2),
                    
                    // Messages de userId2 à userId1
                    new ConditionExpression("cr9bc_fromuser", ConditionOperator.Equal, userId2),
                    new ConditionExpression("cr9bc_touser", ConditionOperator.Equal, userId1)
                }
                    },
                    Orders = { new OrderExpression("cr9bc_timestamp", OrderType.Ascending) }
                };

                var messages = await Task.Run(() => service.RetrieveMultiple(query).Entities); ;
                return messages.Select(m => new ChatMessageDto
                {
                    FromUserId = m.GetAttributeValue<EntityReference>("cr9bc_fromuser").Id,
                    ToUserId = m.GetAttributeValue<EntityReference>("cr9bc_touser").Id,
                    Message = m.GetAttributeValue<string>("cr9bc_message"),
                    Timestamp = m.GetAttributeValue<DateTime>("cr9bc_timestamp"),
                    IsRead = m.GetAttributeValue<bool>("cr9bc_isread"),
                    Name = m.GetAttributeValue<string>("cr9bc_name")
                }).ToList();
            }
        }

        public async Task MarkMessagesAsRead(List<Guid> messageIds)
        {
            if (messageIds == null || messageIds.Count == 0)
                return;

            using (var service = _crmServiceProvider.GetService())
            {
                await Task.Run(() =>
                {
                    foreach (var messageId in messageIds)
                    {
                        var message = new Entity("cr9bc_chatmessage", messageId);
                        message["cr9bc_isread"] = true;
                        service.Update(message);
                    }
                });
            }
        }
        public async Task<List<Guid>> GetUnreadMessages(Guid userId)
        {
            using (var service = _crmServiceProvider.GetService())
            {
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

                return await Task.FromResult(result);
            }
        }

        public async Task<List<EmployeeDto>> GetChatContacts(Guid userId)
        {
            using (var service = _crmServiceProvider.GetService())
            {
                var query = new QueryExpression("systemuser")
                {
                    ColumnSet = new ColumnSet("fullname", "domainname", "photourl", "title", "address1_line1",
                                           "address1_city", "address1_postalcode", "address1_country",
                                           "mobilephone", "isdisabled"),
                    Criteria = new FilterExpression
                    {
                        Conditions =
                {
                    // Exclure l'utilisateur courant et les comptes désactivés
                    new ConditionExpression("systemuserid", ConditionOperator.NotEqual, userId),
                    new ConditionExpression("isdisabled", ConditionOperator.Equal, false)
                }
                    }
                };

                var users = service.RetrieveMultiple(query).Entities;

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
        }
    }
}