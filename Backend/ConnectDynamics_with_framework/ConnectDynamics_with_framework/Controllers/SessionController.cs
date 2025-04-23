using ConnectDynamics_with_framework.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Web.Http.Cors;

namespace ConnectDynamics_with_framework.Controllers
{
    

    [EnableCors(origins: "http://localhost:4200", headers: "*", methods: "*")]
    [RoutePrefix("api/dynamics")]
    public class SessionController : ApiController
    {
        private readonly ISessionService _sessionService;

        public SessionController(ISessionService sessionService)
        {
            _sessionService = sessionService;
        }

        [HttpGet]
        [Route("active-sessions")]
        public IHttpActionResult GetActiveSessions()
        {
            var response = _sessionService.GetActiveSessions();

            if (!response.Success)
            {
                return BadRequest(response.ErrorMessage);
            }

            return Ok(response); // Ou Ok(response.Sessions) si tu préfères juste la liste
        }

        [HttpGet]
        [Route("authenticate/verify-session")]
        public IHttpActionResult VerifySession()
        {
            var response = _sessionService.VerifySession();

            if (!response.IsValid)
            {
                return Unauthorized(); 
            }

            return Ok(response);
        }



    }
}