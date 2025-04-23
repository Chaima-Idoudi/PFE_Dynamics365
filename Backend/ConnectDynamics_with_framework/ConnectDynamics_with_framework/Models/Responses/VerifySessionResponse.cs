using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.Models.Responses
{
	public class VerifySessionResponse
	{
        public bool IsValid { get; set; }
        public bool IsAdmin { get; set; }
        public string Message { get; set; }
    }
}