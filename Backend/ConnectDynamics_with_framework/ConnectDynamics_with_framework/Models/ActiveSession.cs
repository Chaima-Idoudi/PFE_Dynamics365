using System;
using System.ComponentModel.DataAnnotations;

namespace ConnectDynamics_with_framework.Models
{
	public class ActiveSession
	{
        [Key]
        public int Id { get; set; }
        public string UserId { get; set; }
        public string SessionId { get; set; }
        public DateTime LastActivity { get; set; }
    }
}