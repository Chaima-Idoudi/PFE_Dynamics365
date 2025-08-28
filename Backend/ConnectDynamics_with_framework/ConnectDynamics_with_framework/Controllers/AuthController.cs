using ConnectDynamics_with_framework.Interfaces;
using ConnectDynamics_with_framework.Models;
using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Models.Responses;
using ConnectDynamics_with_framework.Services;
using System;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.Cors;

namespace ConnectDynamics_with_framework.Controllers
{
    [EnableCors(origins: "http://localhost:4200", headers: "*", methods: "*")]
    [RoutePrefix("api/dynamics")]
    public class AuthController : ApiController
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost]
        [Route("authenticate")]
        public IHttpActionResult Authenticate([FromBody] AuthRequest request)
        {
            try
            {
                var response = _authService.Authenticate(request);
                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                // Extraire le message d'erreur spécifique depuis l'InnerException
                string errorMessage = "Une erreur s'est produite lors de l'authentification.";

                if (ex.InnerException != null)
                {
                    string innerMessage = ex.InnerException.Message.ToLower();

                    if (innerMessage.Contains("email non trouvé"))
                    {
                        errorMessage = "Invalid email";
                    }
                    else if (innerMessage.Contains("mauvais mot de passe"))
                    {
                        errorMessage = "Incorrect password";
                    }
                }
                else
                {
                    // Vérifier aussi le message principal
                    string mainMessage = ex.Message.ToLower();
                    if (mainMessage.Contains("email non trouvé"))
                    {
                        errorMessage = "Invalid email";
                    }
                    else if (mainMessage.Contains("mauvais mot de passe"))
                    {
                        errorMessage = "Incorrect password";
                    }
                }

                return BadRequest(errorMessage);
            }
        }

        [HttpPost]
        [Route("logout")]
        public IHttpActionResult Logout()
        {
            try
            {
                var response = _authService.Logout();
                return Ok(response);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(); // Utilisateur non autorisé
            }
            catch (Exception)
            {
                return BadRequest("Une erreur s'est produite lors de la déconnexion."); // Autres erreurs
            }
        }

        [HttpGet]
        [Route("me")]
        public IHttpActionResult GetAuthenticatedUser()
        {
            try
            {
                var userDetails = _authService.GetAuthenticatedUserDetails();
                return Ok(userDetails);
            }
            catch (HttpResponseException ex) when (ex.Response.StatusCode == HttpStatusCode.Unauthorized)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Une erreur s'est produite lors de la récupération des détails de l'utilisateur.", ex));
            }
        }
    }
}