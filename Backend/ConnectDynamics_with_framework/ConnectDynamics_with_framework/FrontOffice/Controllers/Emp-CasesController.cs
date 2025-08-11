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

        [HttpPost]
        [Route("updateimage")]
        public IHttpActionResult UpdateCaseImage()
        {
            try
            {
                // Since we're using multipart form data for image upload
                if (!Request.Content.IsMimeMultipartContent())
                {
                    return BadRequest("Le format de la requête n'est pas valide. Utilisez multipart/form-data.");
                }

                var provider = new MultipartMemoryStreamProvider();
                Request.Content.ReadAsMultipartAsync(provider).Wait();

                // Get the case ID from the form data
                var caseIdContent = provider.Contents.FirstOrDefault(c => c.Headers.ContentDisposition.Name.Trim('"') == "caseId");
                if (caseIdContent == null)
                {
                    return BadRequest("L'ID du cas est requis.");
                }

                string caseIdStr = caseIdContent.ReadAsStringAsync().Result;
                if (!Guid.TryParse(caseIdStr, out Guid caseId))
                {
                    return BadRequest("ID de cas invalide");
                }

                // Get the image file from the form data
                var imageContent = provider.Contents.FirstOrDefault(c => c.Headers.ContentDisposition.Name.Trim('"') == "image");
                if (imageContent == null)
                {
                    return BadRequest("L'image est requise.");
                }

                byte[] imageData = imageContent.ReadAsByteArrayAsync().Result;
                if (imageData.Length == 0)
                {
                    return BadRequest("L'image est vide.");
                }

                var result = _empCasesService.UpdateCaseImage(caseId, imageData);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }


    }
}
