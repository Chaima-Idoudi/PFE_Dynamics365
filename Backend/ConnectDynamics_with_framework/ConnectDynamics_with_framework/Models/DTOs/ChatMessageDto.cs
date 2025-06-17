using System;

namespace ConnectDynamics_with_framework.Models.DTOs
{
    public class ChatMessageDto
    {
        
        public Guid FromUserId { get; set; }
        public Guid ToUserId { get; set; }
        public string Message { get; set; }
        public string Name { get; set; }
        public DateTime? Timestamp { get; set; }
        public bool IsRead { get; set; }
    }
}