using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.Models.Responses
{
	public class AuthResponse
	{
        public string Message { get; set; }
        public Guid UserId { get; set; }
        public bool IsAdmin { get; set; }
        public string FullName { get; set; }
        public string Token { get; internal set; }
    }
}