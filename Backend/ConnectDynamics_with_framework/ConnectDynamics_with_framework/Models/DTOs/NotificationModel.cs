using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.Models.DTOs
{
	public class NotificationModel
	{
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string Message { get; set; }
        public Guid CaseId { get; set; }
        public string CaseTitle { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedOn { get; set; }
    }
}