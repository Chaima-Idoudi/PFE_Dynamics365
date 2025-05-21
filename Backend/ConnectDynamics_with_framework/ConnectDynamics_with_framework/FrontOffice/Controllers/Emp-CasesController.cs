using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Net.Http;
using System.Web.Http;
using ConnectDynamics_with_framework.FrontOffice.Services.Interfaces;
using ConnectDynamics_with_framework.Services.Interfaces;
using ConnectDynamics_with_framework.Services;
using System.Net;
using ConnectDynamics_with_framework.FrontOffice.Models.RequestsModels;
using ConnectDynamics_with_framework.FrontOffice.Models.Requests;

namespace ConnectDynamics_with_framework.FrontOffice.Controllers
{
    [RoutePrefix("api/dynamics/employees")]
    public class Emp_CasesController : ApiController
    {
        private readonly IEmp_CasesService _empCasesService;

        public Emp_CasesController(IEmp_CasesService empcasesService)
        {
            _empCasesService = empcasesService;
        }

        [HttpGet]
        [Route("mycases")]
        public IHttpActionResult GetCasesForEmployee()
        {
            try
            {
                var cases = _empCasesService.GetMyCases();

                if (cases == null)
                {
                    // Session inexistante ou expirée
                    return ResponseMessage(Request.CreateResponse(HttpStatusCode.Unauthorized, "Session expirée ou utilisateur non authentifié."));
                }

                return Ok(cases);
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Une erreur est survenue lors de la récupération des cas de l'employé : " + ex.Message));
            }
        }

        [HttpPost]
        [Route("updatecasestage")]
        public IHttpActionResult UpdateCaseStage([FromBody] UpdateCaseStageRequest request)
        {
            try
            {
                if (!Guid.TryParse(request.CaseId, out Guid caseId))
                {
                    return BadRequest("ID de cas invalide");
                }

                var result = _empCasesService.UpdateCaseStage(caseId, request.NewStage);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        [HttpPatch]
        [Route("updatenote")]
        public IHttpActionResult UpdateNote([FromBody] UpdateNoteRequest request)
        {
            try
            {
                if (!Guid.TryParse(request.CaseId, out Guid caseId))
                {
                    return BadRequest("ID de cas invalide");
                }

                var result = _empCasesService.UpdateCaseNote(caseId, request.NewNote);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        [HttpPatch]
        [Route("updatedescription")]
        public IHttpActionResult UpdateDescription([FromBody] UpdateDescriptionRequest request)
        {
            try
            {
                if (!Guid.TryParse(request.CaseId, out Guid caseId))
                {
                    return BadRequest("ID de cas invalide");
                }

                var result = _empCasesService.UpdateCaseDescription(caseId, request.NewDescription);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }
    }
}

   

   

    




