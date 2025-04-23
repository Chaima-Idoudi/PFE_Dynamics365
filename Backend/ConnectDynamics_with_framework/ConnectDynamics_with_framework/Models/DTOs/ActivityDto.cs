using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.Models.DTOs
{
	public class ActivityDto
	{
        public string Subject { get; set; }
        public DateTime? ScheduledStart { get; set; }
        public DateTime? ScheduledEnd { get; set; }
        public string Priority { get; set; }
        public int? ActivityType { get; set; }
        public string AssignedTo { get; set; }
    }
}