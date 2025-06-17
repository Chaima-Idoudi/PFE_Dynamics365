using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Hubs;
using StackExchange.Redis;
using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Services.Interfaces;
using System.Collections.Generic;
using System.Diagnostics;

namespace ConnectDynamics_with_framework.Hubs
{
    [HubName("chatHub")]
    public class ChatHub : Hub
    {
        private static readonly ConcurrentDictionary<Guid, string> UserConnections = new ConcurrentDictionary<Guid, string>();
        private readonly IDatabase _redisDatabase;
        private readonly IChatService _chatService;

        public ChatHub(IDatabase redisDatabase, IChatService chatService)
        {
            _redisDatabase = redisDatabase;
            _chatService = chatService;
        }

        public override async Task OnConnected()
        {
            await base.OnConnected();

        }

        public async Task RegisterUser(Guid userId)
        {
            if (!await _redisDatabase.KeyExistsAsync($"sessions:{userId}"))
            {
                throw new HubException("Unauthorized");
            }

            UserConnections.AddOrUpdate(userId, Context.ConnectionId, (key, oldValue) => Context.ConnectionId);

            await Clients.Caller.SendAsync("RegistrationConfirmed");
        }

        public override async Task OnDisconnected(bool stopCalled)
        {
            foreach (var pair in UserConnections)
            {
                if (pair.Value == Context.ConnectionId)
                {
                    UserConnections.TryRemove(pair.Key, out _);
                    break;
                }
            }
            await base.OnDisconnected(stopCalled);
        }

        public async Task SendMessage(Guid fromUserId, Guid toUserId, string message)
        {
            if (!_redisDatabase.KeyExists($"sessions:{fromUserId}"))
            {
                throw new HubException("Unauthorized");
            }

            try
            {
                // Enregistrer le message d'abord
                var chatMessage = new ChatMessageDto
                {
                    FromUserId = fromUserId,
                    ToUserId = toUserId,
                    Message = message,
                    Timestamp = DateTime.UtcNow,
                    IsRead = false,
                    Name = $"Message {DateTime.UtcNow:yyyyMMddHHmmss}"
                };

                var messageId = await _chatService.AddChatMessage(chatMessage);
                Trace.TraceInformation($"Message saved with ID: {messageId}");

                // Envoyer le message au destinataire si connecté
                if (UserConnections.TryGetValue(toUserId, out var connectionId))
                {
                    await Clients.Client(connectionId).ReceiveMessage(fromUserId, message);
                    Trace.TraceInformation($"Message sent to connected user: {toUserId}");
                }

                // Confirmer l'envoi à l'expéditeur
                await Clients.Caller.MessageSent(toUserId, messageId.ToString());
            }
            catch (Exception ex)
            {
                Trace.TraceInformation($"Error sending message: {ex}");
                await Clients.Caller.SendError("Failed to send message: " + ex.Message);
            }
        }

        public async Task MarkMessagesAsRead(List<Guid> messageIds)
        {
            try
            {
                await _chatService.MarkMessagesAsRead(messageIds);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error marking messages as read: {ex}");
            }
        }

        public async Task GetUnreadMessagesCount(Guid userId)
        {
            try
            {
                var unreadMessages = await _chatService.GetUnreadMessages(userId);
                await Clients.Caller.UpdateUnreadCount(unreadMessages.Count);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error getting unread count: {ex}");
            }
        }
    }
}