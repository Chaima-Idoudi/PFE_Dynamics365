using ConnectDynamics_with_framework.Models.DTOs;
using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Hubs;
using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;

namespace ConnectDynamics_with_framework.Hubs
{

    [HubName("notificationHub")]
    public class NotificationHub : Hub
    {
        private static readonly ConcurrentDictionary<Guid, string> UserConnections = new ConcurrentDictionary<Guid, string>();

        public override Task OnConnected()
        {
            return base.OnConnected();
        }

        public async Task RegisterUser(Guid userId)
        {
            if (UserConnections.TryGetValue(userId, out var oldConnectionId))
            {
                UserConnections.TryRemove(userId, out _);
            }

            UserConnections.TryAdd(userId, Context.ConnectionId);

            await Clients.Caller.RegistrationConfirmed();
        }

        public override Task OnDisconnected(bool stopCalled)
        {
            foreach (var pair in UserConnections)
            {
                if (pair.Value == Context.ConnectionId)
                {
                    UserConnections.TryRemove(pair.Key, out _);
                    break;
                }
            }
            return base.OnDisconnected(stopCalled);
        }

        public static async Task NotifyUser(Guid userId, string message)
        {
            var hubContext = GlobalHost.ConnectionManager.GetHubContext<NotificationHub>();

            if (UserConnections.TryGetValue(userId, out var connectionId))
            {
                await hubContext.Clients.Client(connectionId).ReceiveNotification(message);
            }
        }

        // New method to notify about ticket assignments with full ticket data
        public static async Task NotifyTicketAssignment(Guid userId, CaseDto ticketData)
        {
            var hubContext = GlobalHost.ConnectionManager.GetHubContext<NotificationHub>();

            if (UserConnections.TryGetValue(userId, out var connectionId))
            {
                await hubContext.Clients.Client(connectionId).ReceiveTicketAssignment(ticketData);
            }
        }

    }
}