using Microsoft.Crm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Tooling.Connector;
using System;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Configuration;
using StackExchange.Redis;
using System.Web.Http.Cors;
using System.Collections.Generic;
using Newtonsoft.Json;


namespace ConnectDynamics_with_framework.Controllers
{
    [EnableCors(origins: "http://localhost:4200", headers: "*", methods: "*")]
    public class DynamicsController : ApiController
    {
        private readonly string _connectionString;
        private static IDatabase redisDatabase;
        private static ConnectionMultiplexer redis;

        public DynamicsController()
        {
           
            _connectionString = ConfigurationManager.ConnectionStrings["Dynamics365"].ConnectionString;

            // Connexion à Redis 
            redis = ConnectionMultiplexer.Connect("127.0.0.1:6379"); // Adresse du serveur Redis
            redisDatabase = redis.GetDatabase();
        }

        
        [HttpPost]
        [Route("api/dynamics/authenticate")]
        public IHttpActionResult Authenticate([FromBody] AuthRequest request)
        {
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest("L'email et le mot de passe sont requis.");
            }

            try
            {
                using (var service = GetCrmService())
                {
                    if (service == null || !service.IsReady)
                    {
                        return BadRequest("La connexion à Dynamics 365 a échoué.");
                    }

                    var query = new QueryExpression("systemuser")
                    {
                        ColumnSet = new ColumnSet("fullname", "domainname", "new_mot_de_passe", "cr9bc_isadmin")
                    };
                    query.Criteria.AddCondition("domainname", ConditionOperator.Equal, request.Email);

                    var result = service.RetrieveMultiple(query);

                    if (result.Entities.Count > 0)
                    {
                        var user = result.Entities[0];

                        // Vérification du mot de passe
                        if (user.GetAttributeValue<string>("new_mot_de_passe") == request.Password)
                        {
                            var userId = user.Id.ToString();
                            string sessionKey = $"sessions:{userId}";
                            bool isAdmin = user.Contains("cr9bc_isadmin") && user.GetAttributeValue<bool>("cr9bc_isadmin");
                            string fullName = user.GetAttributeValue<string>("fullname");


                            // Stocker la session dans Redis avec expiration (1h)
                            redisDatabase.StringSet(sessionKey, request.Email, TimeSpan.FromHours(1));

                            return Ok(new { Message = "Authentification réussie", UserId = user.Id , IsAdmin = isAdmin, FullName = fullName });
                        }
                        else
                        {
                            return Unauthorized(); 
                        }
                    }
                    else
                    {
                        return NotFound(); 
                    }
                }
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Une erreur s'est produite lors de l'authentification.", ex));
            }
        }


        [HttpGet]
        [Route("api/dynamics/users")]
        public IHttpActionResult GetUsers()
        {
            var request = HttpContext.Current.Request;
            var userId = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];

            string sessionKey = $"sessions:{userId}";

            if (string.IsNullOrEmpty(userId) || !redisDatabase.KeyExists(sessionKey))
            {
                return Unauthorized(); // L'utilisateur n'est pas connecté
            }

            try
            {
                using (var service = GetCrmService())
                {
                    if (service == null || !service.IsReady)
                    {
                        return BadRequest("La connexion à Dynamics 365 a échoué.");
                    }

                    var query = new QueryExpression("systemuser")
                    {
                        ColumnSet = new ColumnSet("fullname", "domainname")
                    };

                    var users = service.RetrieveMultiple(query);

                    var userList = users.Entities.Select(user => new
                    {
                        FullName = user.GetAttributeValue<string>("fullname"),
                        Email = user.GetAttributeValue<string>("domainname"),
                        UserId = user.Id,
                        IsConnected = redisDatabase.KeyExists($"sessions:{user.Id}")
                    }).ToList();

                    return Ok(userList);
                }
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Une erreur s'est produite lors de la récupération des utilisateurs.", ex));
            }
        }


        // Route GET: api/dynamics/active-sessions (récupérer toutes les sessions actives)
        [HttpGet]
        [Route("api/dynamics/active-sessions")]
        [EnableCors(origins: "http://localhost:4200", headers: "*", methods: "*")]
        public IHttpActionResult GetActiveSessions()
        {
            try
            {
                if (redisDatabase == null)
                {
                    return InternalServerError(new Exception("La connexion à Redis n'est pas disponible."));
                }

                // Récupération des clés de session
                var server = redis.GetServer("127.0.0.1:6379"); // Adresse du serveur Redis
                var sessionKeys = server.Keys(pattern: "sessions:*");

                var activeSessions = sessionKeys
                    .Select(key => new
                    {
                        SessionKey = key.ToString(),
                        UserEmail = redisDatabase.StringGet(key) // Récupération de l'email de l'utilisateur
                    })
                    .ToList();

                return Ok(activeSessions);
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Une erreur s'est produite lors de la récupération des sessions actives.", ex));
            }
        }

        // Route DELETE: api/dynamics/logout (supprime une session spécifique)
        [HttpDelete]
        [Route("api/dynamics/logout")]
        public IHttpActionResult Logout()
        {
            try
            {
                var userId = HttpContext.Current.Request.Headers["Authorization"];
                string sessionKey = $"sessions:{userId}";

                if (string.IsNullOrEmpty(userId) || !redisDatabase.KeyExists(sessionKey))
                {
                    return Unauthorized();
                }

                // Suppression de la session
                redisDatabase.KeyDelete(sessionKey);

                return Ok(new { Message = "Déconnexion réussie" });
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Une erreur s'est produite lors de la déconnexion.", ex));
            }
        }

        [HttpGet]
        [Route("api/dynamics/authenticate/verify-session")]
        public IHttpActionResult VerifySession()
        {
            try
            {
                var request = HttpContext.Current.Request;
                var userId = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];

                if (string.IsNullOrEmpty(userId))
                {
                    return Ok(new { IsValid = false, Message = "Authorization header missing" });
                }

                // Vérifier le format du userId si nécessaire
                if (!Guid.TryParse(userId, out _))
                {
                    return Ok(new { IsValid = false, Message = "Invalid user ID format" });
                }

                string sessionKey = $"sessions:{userId}";

                // Vérifier l'existence de la clé et son expiration
                if (!redisDatabase.KeyExists(sessionKey))
                {
                    return Ok(new { IsValid = false, Message = "Session expired or invalid" });
                }

                // Optionnel : vérifier l'utilisateur dans Dynamics si nécessaire
                bool isAdmin = false;
                using (var service = GetCrmService())
                {
                    if (service != null && service.IsReady)
                    {
                        var user = service.Retrieve("systemuser", new Guid(userId),
                            new ColumnSet("cr9bc_isadmin"));

                        if (user != null)
                        {
                            isAdmin = user.GetAttributeValue<bool>("cr9bc_isadmin");
                        }
                    }
                }

                // Prolonger la session si elle est valide
                redisDatabase.KeyExpire(sessionKey, TimeSpan.FromHours(1));

                return Ok(new
                {
                    IsValid = true,
                    IsAdmin = isAdmin,
                    Message = "Valid session"
                });
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Error verifying session", ex));
            }
        }
       


        private CrmServiceClient GetCrmService()
        {
            try
            {
                return new CrmServiceClient(_connectionString);
            }
            catch (Exception)
            {
                return null;
            }
        }
    }

    // Classe pour la requête d'authentification
    public class AuthRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }
}
