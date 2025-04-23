using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.Models.Responses
{
	public class LogoutResponse
	{
        public bool IsSuccess { get; set; }
        public string Message { get; set; }
        public string Error { get; set; }
    }
}