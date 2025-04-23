using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using ConnectDynamics_with_framework.Models;
using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Models.Responses;

namespace ConnectDynamics_with_framework.Services.Interfaces
{
	public interface ISessionService
	{
        ActiveSessionsResponse GetActiveSessions();
        VerifySessionResponse VerifySession();

    }
}