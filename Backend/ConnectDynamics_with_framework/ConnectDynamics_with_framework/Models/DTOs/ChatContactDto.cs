using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.Models.DTOs
{
	public class ChatContactDto
	{
        public Guid UserId { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public DateTime LastMessageDate { get; set; }
        public int UnreadCount { get; set; }
    }
}