using ConnectDynamics_with_framework.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ConnectDynamics_with_framework.Services.Interfaces
{
    public interface IChatService
    {
        Task<Guid> AddChatMessage(ChatMessageDto chatMessageDto);
        Task<List<ChatMessageDto>> GetMessagesBetweenUsers(Guid userId1, Guid userId2);
        Task MarkMessagesAsRead(List<Guid> messageIds);
        Task<List<Guid>> GetUnreadMessages(Guid userId);
        Task<List<EmployeeDto>> GetChatContacts(Guid userId);
    }
}