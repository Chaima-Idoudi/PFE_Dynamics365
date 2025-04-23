using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.Models.DTOs
{
	public class ActiveSession
	{
        public string SessionKey { get; set; }
        public string UserEmail { get; set; }
    }
    }
