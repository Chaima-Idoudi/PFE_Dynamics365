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
using log4net;

namespace ConnectDynamics_with_framework.Controllers
{
    [EnableCors(origins: "http://localhost:4200", headers: "*", methods: "*")]
    [RoutePrefix("api/dynamics")]
    public class AuthController : ApiController
    {
        private readonly IAuthService _authService;
        private static readonly ILog log = LogManager.GetLogger(typeof(AuthController));

        public AuthController(IAuthService authService)
        {
            _authService = authService;
            log.Debug("AuthController initialisé");
        }

        [HttpPost]
        [Route("authenticate")]
        public IHttpActionResult Authenticate([FromBody] AuthRequest request)
        {
            log.Info($"Requête d'authentification reçue pour: {request?.Email ?? "email non fourni"}");

            try
            {
                var response = _authService.Authenticate(request);
                log.Info($"Authentification réussie pour: {request.Email}");
                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                log.Warn($"Erreur d'argument: {ex.Message}");
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                log.Warn($"Accès non autorisé: {ex.Message}");
                return Unauthorized();
            }
            catch (Exception ex)
            {
                string errorMessage = "Une erreur s'est produite lors de l'authentification.";

                if (ex.InnerException != null)
                {
                    string innerMessage = ex.InnerException.Message.ToLower();
                    log.Error($"Exception interne: {innerMessage}", ex.InnerException);

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
                    string mainMessage = ex.Message.ToLower();
                    log.Error($"Exception principale: {mainMessage}", ex);

                    if (mainMessage.Contains("email non trouvé"))
                    {
                        errorMessage = "Invalid email";
                    }
                    else if (mainMessage.Contains("mauvais mot de passe"))
                    {
                        errorMessage = "Incorrect password";
                    }
                }

                log.Warn($"Réponse d'erreur envoyée: {errorMessage}");
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