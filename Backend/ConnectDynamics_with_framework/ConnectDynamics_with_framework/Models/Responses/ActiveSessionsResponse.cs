using ConnectDynamics_with_framework.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.Models.Responses
{
	public class ActiveSessionsResponse
	{
        public bool Success { get; set; }
        public List<ActiveSession> Sessions { get; set; }
        public string ErrorMessage { get; set; }
       
       
    }
}