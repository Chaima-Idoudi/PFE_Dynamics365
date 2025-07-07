using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Hubs;
using StackExchange.Redis;
using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Services.Interfaces;
using System.Collections.Generic;
using log4net;
using System.IO;
using System.Linq;

namespace ConnectDynamics_with_framework.Hubs
{
    [HubName("chatHub")]
    public class ChatHub : Hub
    {
        private static readonly ILog log = LogManager.GetLogger(typeof(ChatHub));
        public static readonly ConcurrentDictionary<Guid, string> UserConnections = new ConcurrentDictionary<Guid, string>();
        private readonly IDatabase _redisDatabase;
        private readonly IChatService _chatService;

        public ChatHub(IDatabase redisDatabase, IChatService chatService)
        {
            _redisDatabase = redisDatabase;
            _chatService = chatService;
        }

        public override Task OnConnected()
        {
            log.Info($"Client connected: {Context.ConnectionId} from IP: {Context.Request.Environment["server.RemoteIpAddress"]}");
            return base.OnConnected();
        }

        public async Task RegisterUser(string userId)
        {
            log.Info($"[REGISTER] Attempting to register user: {userId} with connection: {Context.ConnectionId}");

            if (!Guid.TryParse(userId, out var userGuid))
            {
                log.Warn($"[REGISTER] Invalid user ID format: {userId}");
                Clients.Caller.registrationFailed("Invalid user ID format");
                return;
            }

            try
            {
                // Vérifier la session Redis
                var sessionExists = await _redisDatabase.KeyExistsAsync($"sessions:{userGuid}").ConfigureAwait(false);
                log.Info($"[REGISTER] Session check for {userGuid}: {sessionExists}");

                if (!sessionExists)
                {
                    log.Warn($"[REGISTER] Unauthorized registration attempt for user: {userGuid}");
                    Clients.Caller.registrationFailed("Unauthorized - Session not found");
                    return;
                }

                // Enregistrer la connexion de façon simple et directe
                UserConnections[userGuid] = Context.ConnectionId;

                log.Info($"[REGISTER] User successfully registered: {userGuid} with connection ID: {Context.ConnectionId}");
                log.Info($"[REGISTER] Total active connections: {UserConnections.Count}");

                Clients.Caller.registrationConfirmed();
            }
            catch (Exception ex)
            {
                log.Error($"[REGISTER] Error registering user {userGuid}", ex);
                Clients.Caller.registrationFailed($"Registration error: {ex.Message}");
            }
        }


        public override Task OnDisconnected(bool stopCalled)
        {
            try
            {
                log.Info($"[DISCONNECT] Client disconnected: {Context.ConnectionId}, stopCalled: {stopCalled}");

                foreach (var pair in UserConnections)
                {
                    if (pair.Value == Context.ConnectionId)
                    {
                        UserConnections.TryRemove(pair.Key, out _);
                        log.Info($"[DISCONNECT] User disconnected: {pair.Key}");
                        break;
                    }
                }

                log.Info($"[DISCONNECT] Remaining active connections: {UserConnections.Count}");
            }
            catch (Exception ex)
            {
                log.Error("[DISCONNECT] Error in OnDisconnected", ex);
            }

            return base.OnDisconnected(stopCalled);
        }

        public async Task<string> SendMessage(string fromUserId, string toUserId, string message)
        {
            log.Info($"[SEND] SendMessage called - From: {fromUserId}, To: {toUserId}, Message: {message?.Length} chars, Connection: {Context.ConnectionId}");

            if (!Guid.TryParse(fromUserId, out var fromGuid) || !Guid.TryParse(toUserId, out var toGuid))
            {
                log.Warn($"[SEND] Invalid user ID format - From: {fromUserId}, To: {toUserId}");
                Clients.Caller.sendError("Invalid user ID format");
                return string.Empty;
            }

            if (string.IsNullOrWhiteSpace(message))
            {
                log.Warn("[SEND] Empty message received");
                Clients.Caller.sendError("Message cannot be empty");
                return string.Empty;
            }

            try
            {
                // 1. Validation de la session
                var sessionValid = await _redisDatabase.KeyExistsAsync($"sessions:{fromGuid}").ConfigureAwait(false);
                if (!sessionValid)
                {
                    log.Warn($"[SEND] Invalid session for user {fromGuid}");
                    Clients.Caller.sendError("Session invalide ou expirée");
                    return string.Empty;
                }

                // 2. Vérifier que l'expéditeur est bien connecté
                if (!UserConnections.TryGetValue(fromGuid, out var senderConnection))
                {
                    log.Warn($"[SEND] Sender not properly registered - User: {fromGuid}");
                    Clients.Caller.sendError("Vous devez être enregistré pour envoyer des messages");
                    return string.Empty;
                }

                log.Info($"[SEND] Creating chat message in database...");

                // 3. Création du message
                var chatMessage = new ChatMessageDto
                {
                    FromUserId = fromGuid,
                    ToUserId = toGuid,
                    Message = message.Trim(),
                    Timestamp = DateTime.UtcNow,
                    IsRead = false,
                    Name = $"Message {DateTime.UtcNow:yyyyMMddHHmmss}"
                };

                // 4. Enregistrement en base
                Guid messageId;
                try
                {
                    messageId = await _chatService.AddChatMessage(chatMessage).ConfigureAwait(false);
                    log.Info($"[SEND] Message saved with ID: {messageId}");
                }
                catch (Exception ex)
                {
                    log.Error("[SEND] Échec de l'enregistrement du message", ex);
                    Clients.Caller.sendError("Échec de l'enregistrement");
                    return string.Empty;
                }

                // 5. Notification en temps réel
                try
                {
                    if (UserConnections.TryGetValue(toGuid, out var recipientConnection))
                    {
                        log.Info($"[SEND] Recipient connected - UserId: {toGuid}, Connection: {recipientConnection}");
                        await Clients.Client(recipientConnection).receiveMessage(fromUserId, message, messageId.ToString());
                        log.Info($"[SEND] Real-time notification sent to {toGuid}");
                    }
                    else
                    {
                        log.Info($"[SEND] Recipient not connected - UserId: {toGuid}");
                    }
                }
                catch (Exception ex)
                {
                    log.Error($"[SEND] Échec de la notification au destinataire {toGuid}", ex);
                }

                // 6. Confirmation à l'expéditeur
                log.Info($"[SEND] Sending confirmation to sender for message ID: {messageId}");
                await Clients.Caller.messageSent(toUserId, messageId.ToString());

                log.Info($"[SEND] Message successfully sent with ID: {messageId}");
                return messageId.ToString();
            }
            catch (Exception ex)
            {
                log.Error("[SEND] Erreur non gérée dans SendMessage", ex);
                Clients.Caller.sendError($"Erreur interne: {ex.Message}");
                return string.Empty;
            }
        }

        public async Task MarkMessagesAsRead(List<string> messageIds)
        {
            log.Info($"[READ] MarkMessagesAsRead called with {messageIds?.Count ?? 0} message IDs");

            if (messageIds == null || messageIds.Count == 0)
            {
                log.Warn("[READ] MarkMessagesAsRead called with empty messageIds");
                return;
            }

            var guidList = new List<Guid>();
            foreach (var id in messageIds)
            {
                if (Guid.TryParse(id, out var guid))
                    guidList.Add(guid);
            }

            if (guidList.Count == 0)
            {
                log.Warn("[READ] No valid message IDs found");
                return;
            }

            try
            {
                log.Info($"[READ] Marking {guidList.Count} messages as read");
                await _chatService.MarkMessagesAsRead(guidList).ConfigureAwait(false);
                log.Info($"[READ] Successfully marked {guidList.Count} messages as read");

                Clients.Caller.messagesMarkedAsRead(messageIds);
            }
            catch (Exception ex)
            {
                log.Error("[READ] Error marking messages as read", ex);
                Clients.Caller.operationError("Failed to mark messages as read: " + ex.Message);
            }
        }

        public async Task GetUnreadMessagesCount(string userId)
        {
            if (!Guid.TryParse(userId, out var userGuid))
            {
                Clients.Caller.operationError("Invalid user ID format");
                return;
            }

            try
            {
                log.Info($"[UNREAD] Getting unread messages count for user {userGuid}");
                var unreadMessages = await _chatService.GetUnreadMessages(userGuid).ConfigureAwait(false);
                Clients.Caller.updateUnreadCount(unreadMessages.Count);
                log.Info($"[UNREAD] Unread messages for user {userGuid}: {unreadMessages.Count}");
            }
            catch (Exception ex)
            {
                log.Error("[UNREAD] Error getting unread count", ex);
                Clients.Caller.operationError("Failed to get unread count: " + ex.Message);
            }
        }

        public void Ping()
        {
            log.Debug($"[PING] Ping received from client: {Context.ConnectionId}");
            Clients.Caller.pong();
        }

        public void Echo(string message)
        {
            log.Info($"[ECHO] Echo called with message: {message} from {Context.ConnectionId}");
            Clients.Caller.echo($"Echo: {message}");
        }

        public string TestConnection()
        {
            log.Info($"[TEST] TestConnection called from {Context.ConnectionId}");
            return "Connection working!";
        }

        public void GetConnectionInfo()
        {
            var info = new
            {
                ConnectionId = Context.ConnectionId,
                TotalConnections = UserConnections.Count,
                UserConnections = UserConnections.ToArray()
            };

            log.Info($"[INFO] Connection info requested by {Context.ConnectionId}");
            Clients.Caller.connectionInfo(info);
        }
        public async Task SendTypingStatus(string fromUserId, string toUserId, bool isTyping)
        {
            log.Info($"[TYPING] SendTypingStatus called - From: {fromUserId}, To: {toUserId}, IsTyping: {isTyping}, Connection: {Context.ConnectionId}");

            if (!Guid.TryParse(fromUserId, out var fromGuid) || !Guid.TryParse(toUserId, out var toGuid))
            {
                log.Warn($"[TYPING] Invalid user ID format - From: {fromUserId}, To: {toUserId}");
                Clients.Caller.sendError("Invalid user ID format");
                return;
            }

            try
            {
                // 1. Validation de la session
                var sessionValid = await _redisDatabase.KeyExistsAsync($"sessions:{fromGuid}").ConfigureAwait(false);
                if (!sessionValid)
                {
                    log.Warn($"[TYPING] Invalid session for user {fromGuid}");
                    Clients.Caller.sendError("Session invalide ou expirée");
                    return;
                }

                // 2. Vérifier que l'expéditeur est bien connecté
                if (!UserConnections.TryGetValue(fromGuid, out var senderConnection))
                {
                    log.Warn($"[TYPING] Sender not properly registered - User: {fromGuid}");
                    Clients.Caller.sendError("Vous devez être enregistré pour envoyer des notifications de frappe");
                    return;
                }

                // 3. Notification en temps réel au destinataire
                if (UserConnections.TryGetValue(toGuid, out var recipientConnection))
                {
                    log.Info($"[TYPING] Recipient connected - UserId: {toGuid}, Connection: {recipientConnection}, IsTyping: {isTyping}");
                    await Clients.Client(recipientConnection).typingStatusUpdate(fromUserId, isTyping);
                    log.Info($"[TYPING] Typing status notification sent to {toGuid}");
                }
                else
                {
                    log.Info($"[TYPING] Recipient not connected - UserId: {toGuid}");
                }
            }
            catch (Exception ex)
            {
                log.Error("[TYPING] Error in SendTypingStatus", ex);
                Clients.Caller.sendError($"Error sending typing status: {ex.Message}");
            }
        }

        public async Task SendFileMessage(string fromUserId, string toUserId, string messageText, string fileName, string fileType, int fileSize)
        {
            log.Info($"[FILE] SendFileMessage called - From: {fromUserId}, To: {toUserId}, File: {fileName}");

            if (!Guid.TryParse(fromUserId, out var fromGuid) || !Guid.TryParse(toUserId, out var toGuid))
            {
                log.Warn($"[FILE] Invalid user ID format - From: {fromUserId}, To: {toUserId}");
                Clients.Caller.sendError("Invalid user ID format");
                return;
            }

            try
            {
                // 1. Create the message in database first
                var chatMessage = new ChatMessageDto
                {
                    FromUserId = fromGuid,
                    ToUserId = toGuid,
                    Message = messageText,
                    Timestamp = DateTime.UtcNow,
                    IsRead = false,
                    Name = $"File: {fileName}",
                    HasAttachment = true,
                    AttachmentType = fileType,
                    AttachmentName = fileName,
                    AttachmentSize = fileSize
                };

                // 2. Save to database and get the message ID
                Guid messageId = await _chatService.AddChatMessageWithAttachment(chatMessage, new byte[0]);
                log.Info($"[FILE] Message saved with ID: {messageId}");

                // 3. Get the complete message with all details
                var completeMessage = await _chatService.GetMessageById(messageId);
                if (completeMessage == null)
                {
                    log.Error($"[FILE] Failed to retrieve complete message for ID: {messageId}");
                    Clients.Caller.sendError("Failed to retrieve message details");
                    return;
                }

                // 4. Notify recipient with complete message details
                if (UserConnections.TryGetValue(toGuid, out var recipientConnection))
                {
                    log.Info($"[FILE] Recipient connected - UserId: {toGuid}, Connection: {recipientConnection}");

                    await Clients.Client(recipientConnection).receiveFileMessage(
                        completeMessage.FromUserId.ToString(),
                        completeMessage.Message,
                        completeMessage.AttachmentName,
                        completeMessage.AttachmentType,
                        completeMessage.AttachmentSize,
                        completeMessage.Id.ToString(),
                        completeMessage.AttachmentUrl
                    );

                    log.Info($"[FILE] Complete file message sent to {toGuid}");
                }
                else
                {
                    log.Info($"[FILE] Recipient not connected - UserId: {toGuid}");
                }

                // 5. Confirm to sender with complete details
                await Clients.Caller.fileMessageSent(
                    toUserId,
                    messageId.ToString(),
                    fileName,
                    fileType,
                    fileSize,
                    completeMessage.AttachmentUrl
                );
            }
            catch (Exception ex)
            {
                log.Error("[FILE] Error in SendFileMessage", ex);
                Clients.Caller.sendError($"Error sending file message: {ex.Message}");
            }
        }
        public async Task NotifyFileUploadComplete(string fromUserId, string toUserId, string messageId, string fileName)
        {
            log.Info($"[FILE] NotifyFileUploadComplete called - From: {fromUserId}, To: {toUserId}, File: {fileName}, MessageId: {messageId}");

            if (!Guid.TryParse(fromUserId, out var fromGuid) || !Guid.TryParse(toUserId, out var toGuid) || !Guid.TryParse(messageId, out var msgGuid))
            {
                log.Warn($"[FILE] Invalid ID format - From: {fromUserId}, To: {toUserId}, MessageId: {messageId}");
                return;
            }

            try
            {
                var chatMessage = await _chatService.GetMessageById(msgGuid);
                if (chatMessage == null)
                {
                    log.Error($"[FILE] Message not found: {messageId}");
                    return;
                }

                // Notify recipient directly with complete file message
                if (UserConnections.TryGetValue(toGuid, out var recipientConnection))
                {
                    log.Info($"[FILE] Notifying recipient {toUserId} about new file");
                    await Clients.Client(recipientConnection).receiveFileMessage(
                        fromUserId,
                        chatMessage.Message,
                        chatMessage.AttachmentName,
                        chatMessage.AttachmentType,
                        chatMessage.AttachmentSize,
                        messageId
                    );
                }
                else
                {
                    log.Warn($"[FILE] Recipient {toUserId} not connected, notification not sent");
                }
            }
            catch (Exception ex)
            {
                log.Error($"[FILE] Error in NotifyFileUploadComplete: {ex.Message}", ex);
            }
        }
        private string DetermineFileType(string fileName)
        {
            string extension = Path.GetExtension(fileName).ToLowerInvariant();
            if (new[] { ".jpg", ".jpeg", ".png", ".gif", ".bmp" }.Contains(extension))
                return "1"; // Image
            if (new[] { ".pdf", ".doc", ".docx", ".txt" }.Contains(extension))
                return "2"; // Document
            return "3"; // Other
        }

    }
    }