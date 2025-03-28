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
                        ColumnSet = new ColumnSet("fullname", "domainname", "new_mot_de_passe")
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

                            // Stocker la session dans Redis avec expiration (1h)
                            redisDatabase.StringSet(sessionKey, request.Email, TimeSpan.FromHours(1));

                            return Ok(new { Message = "Authentification réussie", UserId = user.Id });
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
                        UserId = user.Id
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
        [Route("api/dynamics/verify-session")]
        public IHttpActionResult VerifySession()
        {
            var userId = HttpContext.Current.Request.Headers["Authorization"];
            string sessionKey = $"sessions:{userId}";

            if (string.IsNullOrEmpty(userId) || !redisDatabase.KeyExists(sessionKey))
            {
                return Unauthorized();
            }

            return Ok();
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
