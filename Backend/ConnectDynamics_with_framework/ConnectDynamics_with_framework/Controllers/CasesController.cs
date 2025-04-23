using ConnectDynamics_with_framework.Models;
using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Web.Http;

namespace ConnectDynamics_with_framework.Controllers
{
    [RoutePrefix("api/dynamics")]
    public class CasesController : ApiController
    {
        private readonly ICasesServices _casesService;

        public CasesController(ICasesServices casesService)
        {
            _casesService = casesService;
        }

        // GET api/cases/{userId}
        [HttpGet]
        [Route("cases")]
        public IHttpActionResult GetCases()
        {
            try
            {
                var cases = _casesService.GetCases();

                if (cases == null)
                {
                    // Session inexistante ou expirée
                    return ResponseMessage(Request.CreateResponse(HttpStatusCode.Unauthorized, "Session expirée ou utilisateur non authentifié."));
                }

                return Ok(cases);
            }
            catch (Exception ex)
            {
                // Gérer les erreurs liées à la connexion CRM ou autres
                return InternalServerError(new Exception("Une erreur est survenue lors de la récupération des cas : " + ex.Message));
            }
        }

        [HttpPost]
        [Route("assign-case")]
        public IHttpActionResult AssignCaseToUser([FromBody] AssignCaseModel requestModel)
        {
            try
            {
                var message = _casesService.AssignCaseToUser(requestModel);
                return Ok(message);
            }
            catch (HttpResponseException ex)
            {
                return ResponseMessage(ex.Response);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        [HttpPut]
        [Route("update-case")]
        public IHttpActionResult UpdateCase([FromBody] CaseDto model)
        {
            if (model == null || model.IncidentId == Guid.Empty)
            {
                return Content(HttpStatusCode.BadRequest, "Le modèle de mise à jour est invalide.");
            }

            try
            {
                var result = _casesService.UpdateCase(model);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, ex.Message);
            }

        }
    }
}
