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
using ConnectDynamics_with_framework.FrontOffice.Models;
using System.Threading.Tasks;

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

        [HttpPost]
        [Route("updateimages")]
        public async Task<IHttpActionResult> UpdateCaseImages()
        {
            try
            {
                if (!Request.Content.IsMimeMultipartContent())
                    return BadRequest("Le format de la requête n'est pas valide. Utilisez multipart/form-data.");

                // Lecture asynchrone avec timeout
                var provider = new MultipartMemoryStreamProvider();
                await Request.Content.ReadAsMultipartAsync(provider);

                // Récupérer l'ID du cas
                var caseIdContent = provider.Contents.FirstOrDefault(c =>
                    c.Headers.ContentDisposition?.Name?.Trim('"') == "caseId");

                if (caseIdContent == null)
                    return BadRequest("L'ID du cas est requis.");

                string caseIdStr = await caseIdContent.ReadAsStringAsync();
                if (!Guid.TryParse(caseIdStr, out Guid caseId))
                    return BadRequest("ID de cas invalide");

                // Récupérer tous les fichiers images
                var fileContents = provider.Contents.Where(c =>
                    !string.IsNullOrEmpty(c.Headers.ContentDisposition?.FileName)).ToList();

                if (!fileContents.Any())
                    return BadRequest("Au moins une image est requise.");

                var images = new List<ImageFileDto>();

                foreach (var fileContent in fileContents)
                {
                    try
                    {
                        var fileName = fileContent.Headers.ContentDisposition.FileName?.Trim('"');
                        var mimeType = fileContent.Headers.ContentType?.MediaType ?? "application/octet-stream";

                        // Lecture asynchrone des bytes
                        var bytes = await fileContent.ReadAsByteArrayAsync();

                        if (bytes?.Length > 0)
                        {
                            // Validation de la taille du fichier (ex: max 10MB)
                            if (bytes.Length > 10 * 1024 * 1024)
                            {
                                return BadRequest($"Le fichier {fileName} est trop volumineux (max 10MB).");
                            }

                            images.Add(new ImageFileDto
                            {
                                Data = bytes,
                                FileName = fileName ?? $"image_{Guid.NewGuid()}.jpg",
                                MimeType = mimeType
                            });
                        }
                    }
                    catch (Exception ex)
                    {
                        // Log l'erreur mais continue avec les autres fichiers
                        System.Diagnostics.Debug.WriteLine($"Erreur lors du traitement d'un fichier: {ex.Message}");
                    }
                }

                if (images.Count == 0)
                    return BadRequest("Aucune image valide n'a été trouvée.");

                // Appel du service
                var result = _empCasesService.UpdateCaseImages(caseId, images);

                // Récupérer et retourner les détails mis à jour du cas
                var updatedCase = _empCasesService.GetCaseDetails(caseId);

                return Ok(new
                {
                    Message = result,
                    Case = updatedCase,
                    ImagesCount = images.Count
                });
            }
            catch (HttpResponseException)
            {
                throw; // Relancer les exceptions HTTP spécifiques
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Erreur dans UpdateCaseImages: {ex}");
                return InternalServerError(new Exception($"Une erreur est survenue lors de la mise à jour des images : {ex.Message}"));
            }
        }

        [HttpGet]
        [Route("case/{caseId}")]
        public IHttpActionResult GetCaseDetails(string caseId)
        {
            try
            {
                if (!Guid.TryParse(caseId, out Guid caseGuid))
                {
                    return BadRequest("ID de cas invalide");
                }

                var caseDetails = _empCasesService.GetCaseDetails(caseGuid);
                return Ok(caseDetails);
            }
            catch (HttpResponseException ex)
            {
                return ResponseMessage(Request.CreateResponse(ex.Response.StatusCode, ex.Response.ReasonPhrase));
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Une erreur est survenue lors de la récupération des détails du cas : " + ex.Message));
            }
        }

        [HttpDelete]
        [Route("deleteimage/{caseId}")]
        public IHttpActionResult DeleteCaseImage(string caseId, [FromUri] string fileName)
        {
            try
            {
                if (!Guid.TryParse(caseId, out Guid caseGuid))
                {
                    return BadRequest("ID de cas invalide");
                }

                if (string.IsNullOrEmpty(fileName))
                {
                    return BadRequest("Nom de fichier requis");
                }

                var result = _empCasesService.DeleteCaseImage(caseGuid, fileName);
                return Ok(result);
            }
            catch (HttpResponseException ex)
            {
                return ResponseMessage(Request.CreateResponse(ex.Response.StatusCode, ex.Response.ReasonPhrase));
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Une erreur est survenue lors de la suppression de l'image : " + ex.Message));
            }
        }

        [HttpPost]
        [Route("updatecasestagewithReason")]
        public IHttpActionResult UpdateCaseStageWithReason([FromBody] UpdateCaseStageWithReasonRequest request)
        {
            try
            {
                if (!Guid.TryParse(request.CaseId, out Guid caseId))
                {
                    return BadRequest("ID de cas invalide");
                }

                var result = _empCasesService.UpdateCaseStageWithReason(caseId, request.NewStage, request.CancellationReason);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

    }
}
