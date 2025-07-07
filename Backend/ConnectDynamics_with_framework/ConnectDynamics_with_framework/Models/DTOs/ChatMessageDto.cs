using System;

namespace ConnectDynamics_with_framework.Models.DTOs
{
    public class ChatMessageDto
    {
        public Guid Id { get; set; } // Assurez-vous que cette propriété existe
        public Guid FromUserId { get; set; }
        public Guid ToUserId { get; set; }
        public string Message { get; set; }
        public string Name { get; set; }
        public DateTime? Timestamp { get; set; }
        public bool IsRead { get; set; }

        // New properties for attachments
        public bool HasAttachment { get; set; }
        public string AttachmentType { get; set; }
        public string AttachmentName { get; set; }
        public string AttachmentUrl { get; set; }
        public int AttachmentSize { get; set; }
        public byte[] AttachmentData { get; set; }

    }
}