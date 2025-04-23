using ConnectDynamics_with_framework.Services;
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
    public class ActivitiesController : ApiController
	{
        private readonly IActivitiesService _activitiesService;

        public ActivitiesController(IActivitiesService activitiesService)
        {
            _activitiesService = activitiesService;
        }

        
        [HttpGet]
        [Route("activities")]
        public IHttpActionResult GetActivities()
        {
            try
            {
                var activities = _activitiesService.getActivities();
                return Ok(activities);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Une erreur s'est produite lors de la récupération des employés.", ex));
            }
        }
        }
}