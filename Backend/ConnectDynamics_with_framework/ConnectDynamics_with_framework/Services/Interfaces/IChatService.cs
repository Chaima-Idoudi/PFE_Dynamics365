using ConnectDynamics_with_framework.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ConnectDynamics_with_framework.Services.Interfaces
{
    public interface IChatService
    {
        Task<Guid> AddChatMessage(ChatMessageDto chatMessageDto);
        Task<bool> VerifyMessageExists(Guid messageId);
        Task<List<ChatMessageDto>> GetMessagesBetweenUsers(Guid userId1, Guid userId2);
        Task MarkMessagesAsRead(List<Guid> messageIds);
        Task<List<Guid>> GetUnreadMessages(Guid userId);
        Task<List<EmployeeDto>> GetChatContacts(Guid userId);

        // Nouvelles méthodes pour la gestion des fichiers
        Task<Guid> AddChatMessageWithAttachment(ChatMessageDto chatMessageDto, byte[] fileData);
        Task<byte[]> GetAttachmentData(Guid messageId);

        Task<ChatMessageDto> GetMessageById(Guid messageId);

    }
}