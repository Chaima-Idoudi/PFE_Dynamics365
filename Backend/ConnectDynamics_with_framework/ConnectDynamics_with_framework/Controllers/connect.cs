//using Microsoft.Crm.Sdk.Messages;
//using Microsoft.Xrm.Sdk.Query;
//using Microsoft.Xrm.Sdk;
//using Microsoft.Xrm.Tooling.Connector;
//using System;
//using System.Linq;
//using System.Web;
//using System.Web.Http;
//using System.Configuration;
//using StackExchange.Redis;
//using System.Web.Http.Cors;
//using System.Collections.Generic;
//using Newtonsoft.Json;
//using System.Net;
//using System.ServiceModel;
//using ConnectDynamics_with_framework.Models;


//namespace ConnectDynamics_with_framework.Controllers
//{
//    [EnableCors(origins: "http://localhost:4200", headers: "*", methods: "*")]
//    public class DynamicsController : ApiController
//    {
//        private readonly string _connectionString;
//        private readonly string _redisConnectionString;
//        private static IDatabase redisDatabase;
//        private static ConnectionMultiplexer redis;

//        public DynamicsController()
//        {

//            _connectionString = ConfigurationManager.ConnectionStrings["Dynamics365"].ConnectionString;
//            _redisConnectionString = ConfigurationManager.AppSettings["RedisConnection"];

//            // Connexion à Redis 
//            redis = ConnectionMultiplexer.Connect(_redisConnectionString);
//            redisDatabase = redis.GetDatabase();
//        }


//        [HttpPost]
//        [Route("api/dynamics/authenticate")]
//        public IHttpActionResult Authenticate([FromBody] AuthRequest request)
//        {
//            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
//            {
//                return BadRequest("L'email et le mot de passe sont requis.");
//            }

//            try
//            {
//                using (var service = GetCrmService())
//                {
//                    if (service == null || !service.IsReady)
//                    {
//                        return BadRequest("La connexion à Dynamics 365 a échoué.");
//                    }

//                    var query = new QueryExpression("systemuser")
//                    {
//                        ColumnSet = new ColumnSet("fullname", "domainname", "new_mot_de_passe", "cr9bc_isadmin")
//                    };
//                    query.Criteria.AddCondition("domainname", ConditionOperator.Equal, request.Email);

//                    var result = service.RetrieveMultiple(query);

//                    if (result.Entities.Count > 0)
//                    {
//                        var user = result.Entities[0];

//                        // Vérification du mot de passe
//                        if (user.GetAttributeValue<string>("new_mot_de_passe") == request.Password)
//                        {
//                            var userId = user.Id.ToString();
//                            string sessionKey = $"sessions:{userId}";
//                            bool isAdmin = user.Contains("cr9bc_isadmin") && user.GetAttributeValue<bool>("cr9bc_isadmin");
//                            string fullName = user.GetAttributeValue<string>("fullname");


//                            // Stocker la session dans Redis avec expiration (1h)
//                            redisDatabase.StringSet(sessionKey, request.Email, TimeSpan.FromHours(1));

//                            return Ok(new { Message = "Authentification réussie", UserId = user.Id, IsAdmin = isAdmin, FullName = fullName });
//                        }
//                        else
//                        {
//                            return Unauthorized();
//                        }
//                    }
//                    else
//                    {
//                        return NotFound();
//                    }
//                }
//            }
//            catch (Exception ex)
//            {
//                return InternalServerError(new Exception("Une erreur s'est produite lors de l'authentification.", ex));
//            }
//        }

//        [HttpGet]
//        [Route("api/dynamics/users")]
//        public IHttpActionResult GetUsers()
//        {
//            var request = HttpContext.Current.Request;
//            var userIdStr = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];

//            if (string.IsNullOrEmpty(userIdStr) || !redisDatabase.KeyExists($"sessions:{userIdStr}"))
//            {
//                return Unauthorized(); // L'utilisateur n'est pas connecté
//            }

//            try
//            {
//                Guid currentUserId;
//                if (!Guid.TryParse(userIdStr, out currentUserId))
//                {
//                    return BadRequest("Identifiant utilisateur invalide.");
//                }

//                using (var service = GetCrmService())
//                {
//                    if (service == null || !service.IsReady)
//                    {
//                        return BadRequest("La connexion à Dynamics 365 a échoué.");
//                    }

//                    var query = new QueryExpression("systemuser")
//                    {
//                        ColumnSet = new ColumnSet("fullname", "domainname", "new_istechnician", "cr9bc_isadmin", "address1_name", "address1_country", "address1_city", "address1_postalcode", "mobilephone", "photourl")
//                    };

//                    var users = service.RetrieveMultiple(query);

//                    var userList = users.Entities
//                        .Where(user => user.Id != currentUserId) // Exclure l'utilisateur connecté
//                        .Select(user => new
//                        {
//                            FullName = user.GetAttributeValue<string>("fullname"),
//                            Email = user.GetAttributeValue<string>("domainname"),
//                            UserId = user.Id,
//                            IsConnected = redisDatabase.KeyExists($"sessions:{user.Id}"),
//                            IsTechnician = user.GetAttributeValue<bool>("new_istechnician"),
//                            isAdmin = user.Contains("cr9bc_isadmin") && user.GetAttributeValue<bool>("cr9bc_isadmin"),
//                            Address = user.GetAttributeValue<string>("Address1_name"),
//                            Country = user.GetAttributeValue<string>("Address1_country"),
//                            City = user.GetAttributeValue<string>("Address1_city"),
//                            CodePostal = user.GetAttributeValue<string>("Address1_postalcode"),
//                            PhoneNumber = user.GetAttributeValue<string>("Mobilephone"),
//                            Photo = user.GetAttributeValue<string>("photourl"),
//                        }).ToList();

//                    return Ok(userList);
//                }
//            }
//            catch (Exception ex)
//            {
//                return InternalServerError(new Exception("Une erreur s'est produite lors de la récupération des utilisateurs.", ex));
//            }
//        }


//        [HttpGet]
//        [Route("api/dynamics/activities")]
//        public IHttpActionResult GetActivities()
//        {
//            var request = HttpContext.Current.Request;
//            var userId = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];

//            string sessionKey = $"sessions:{userId}";

//            if (string.IsNullOrEmpty(userId) || !redisDatabase.KeyExists(sessionKey))
//            {
//                return Unauthorized(); // L'utilisateur n'est pas connecté
//            }
//            try
//            {
//                using (var service = GetCrmService())
//                {
//                    if (service == null || !service.IsReady)
//                    {
//                        return BadRequest("La connexion à Dynamics 365 a échoué.");
//                    }

//                    var query = new QueryExpression("activitypointer")
//                    {
//                        ColumnSet = new ColumnSet("subject", "scheduledstart", "scheduledend", "activitytypecode", "ownerid", "prioritycode")
//                    };

//                    var results = service.RetrieveMultiple(query);

//                    var activities = results.Entities.Select(a => new
//                    {
//                        Subject = a.GetAttributeValue<string>("subject"),
//                        ScheduledStart = a.GetAttributeValue<DateTime?>("scheduledstart"),
//                        ScheduledEnd = a.GetAttributeValue<DateTime?>("scheduledend"),
//                        Priority = a.Contains("prioritycode") && a["prioritycode"] is OptionSetValue
//                            ? ConvertPriorityCode(((OptionSetValue)a["prioritycode"]).Value)
//                            : null,
//                        ActivityType = a.Contains("activitytypecode") && a["activitytypecode"] is OptionSetValue
//                            ? ((OptionSetValue)a["activitytypecode"]).Value
//                            : (int?)null,
//                        AssignedTo = a.Contains("ownerid") && a["ownerid"] is EntityReference ownerRef
//                            ? ownerRef.Name
//                            : null
//                    }).ToList();

//                    return Ok(activities);
//                }
//            }
//            catch (Exception ex)
//            {
//                return InternalServerError(new Exception("Une erreur s'est produite lors de la récupération des activités.", ex));
//            }
//        }

//        // Méthode pour convertir le code priorité en texte
//        private string ConvertPriorityCode(int priorityCode)
//        {
//            switch (priorityCode)
//            {
//                case 1: return "high";
//                case 2: return "medium";
//                case 3: return "low";
//                default: return null;
//            }
//        }


//        [HttpGet]
//        [Route("api/dynamics/cases")]
//        public IHttpActionResult GetCases()
//        {
//            var request = HttpContext.Current.Request;
//            var userId = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];

//            string sessionKey = $"sessions:{userId}";

//            if (string.IsNullOrEmpty(userId) || !redisDatabase.KeyExists(sessionKey))
//            {
//                return Unauthorized(); // L'utilisateur n'est pas connecté
//            }
//            try
//            {
//                using (var service = GetCrmService())
//                {
//                    if (service == null || !service.IsReady)
//                    {
//                        return BadRequest("La connexion à Dynamics 365 a échoué.");
//                    }

//                    var query = new QueryExpression("incident")
//                    {
//                        ColumnSet = new ColumnSet(
//                            "incidentid",
//                            "ticketnumber",
//                            "title",
//                            "createdon",
//                            "casetypecode",
//                            "activitiescomplete",
//                            "description",
//                            "ownerid",
//                            "prioritycode",
//                            "statuscode"

//                        )
//                    };

//                    var results = service.RetrieveMultiple(query);

//                    var cases = results.Entities.Select(c => new
//                    {
//                        IncidentId = c.Id,
//                        CaseNumber = c.GetAttributeValue<string>("ticketnumber"),
//                        Title = c.GetAttributeValue<string>("title"),
//                        CreatedOn = c.GetAttributeValue<DateTime?>("createdon"),
//                        CaseType = c.GetAttributeValue<OptionSetValue>("casetypecode") != null
//                            ? ConvertCaseTypeCode(c.GetAttributeValue<OptionSetValue>("casetypecode").Value)
//                            : null,
//                        ActivitiesComplete = c.GetAttributeValue<bool?>("activitiescomplete"),
//                        Description = c.GetAttributeValue<string>("description"),
//                        Owner = c.GetAttributeValue<EntityReference>("ownerid")?.Name,
//                        Priority = c.GetAttributeValue<OptionSetValue>("prioritycode") != null
//                            ? ConvertPriorityCode(c.GetAttributeValue<OptionSetValue>("prioritycode").Value)
//                            : null,
//                        Status = c.GetAttributeValue<OptionSetValue>("statuscode") != null
//                            ? ConvertStatusCode(c.GetAttributeValue<OptionSetValue>("statuscode").Value)
//                            : null
//                    }).ToList();

//                    return Ok(cases);
//                }
//            }
//            catch (Exception ex)
//            {
//                return InternalServerError(new Exception("Une erreur s'est produite lors de la récupération des cas.", ex));
//            }
//        }

//        private string ConvertCaseTypeCode(int caseTypeCode)
//        {
//            switch (caseTypeCode)
//            {
//                case 1: return "Question";
//                case 2: return "Problem";
//                case 3: return "Request";
//                default: return null;
//            }
//        }



//        private string ConvertStatusCode(int statusCode)
//        {
//            switch (statusCode)
//            {
//                case 1: return "In Progress";
//                case 2: return "On Hold";
//                case 3: return "Waiting for Details";
//                case 4: return "Researching";
//                default: return "In Progress";
//            }
//        }

//        [HttpPost]
//        [Route("api/dynamics/assign-case")]
//        public IHttpActionResult AssignCaseToUser([FromBody] AssignCaseModel requestModel)
//        {
//            var request = HttpContext.Current.Request;
//            var userIdHeader = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];
//            string sessionKey = $"sessions:{userIdHeader}";

//            if (string.IsNullOrEmpty(userIdHeader) || !redisDatabase.KeyExists(sessionKey))
//            {
//                return Unauthorized(); // L'utilisateur n'est pas connecté
//            }

//            if (requestModel == null || requestModel.CaseId == Guid.Empty || requestModel.UserId == Guid.Empty)
//            {
//                return BadRequest("Les données envoyées sont invalides.");
//            }

//            try
//            {
//                using (var service = GetCrmService())
//                {
//                    if (service == null || !service.IsReady)
//                    {
//                        return BadRequest("La connexion à Dynamics 365 a échoué.");
//                    }

//                    // Récupérer le nom du case
//                    var incident = service.Retrieve("incident", requestModel.CaseId, new ColumnSet("title"));
//                    string caseTitle = incident.GetAttributeValue<string>("title") ?? "Inconnu";

//                    // Récupérer le nom de l'utilisateur
//                    var user = service.Retrieve("systemuser", requestModel.UserId, new ColumnSet("fullname"));
//                    string userName = user.GetAttributeValue<string>("fullname") ?? "Utilisateur inconnu";

//                    // Effectuer l'assignation
//                    var assignRequest = new AssignRequest
//                    {
//                        Assignee = new EntityReference("systemuser", requestModel.UserId),
//                        Target = new EntityReference("incident", requestModel.CaseId)
//                    };

//                    service.Execute(assignRequest);

//                    // Retour personnalisé
//                    return Ok($"Case : {caseTitle} est bien assignée à :{userName}.");
//                }
//            }
//            catch (FaultException<OrganizationServiceFault> faultEx)
//            {
//                var errorMessage = faultEx.Detail != null ? faultEx.Detail.Message : faultEx.Message;
//                return InternalServerError(new Exception("Erreur CRM : " + errorMessage, faultEx));
//            }
//            catch (Exception ex)
//            {
//                return InternalServerError(new Exception("Erreur inconnue lors de l’assignation de la case.", ex));
//            }
//        }

//        // Route GET: api/dynamics/active-sessions (récupérer toutes les sessions actives)
//        [HttpGet]
//        [Route("api/dynamics/active-sessions")]
//        [EnableCors(origins: "http://localhost:4200", headers: "*", methods: "*")]
//        public IHttpActionResult GetActiveSessions()
//        {
//            try
//            {
//                if (redisDatabase == null)
//                {
//                    return InternalServerError(new Exception("La connexion à Redis n'est pas disponible."));
//                }

//                // Récupération des clés de session
//                var server = redis.GetServer(_redisConnectionString); // Adresse du serveur Redis
//                var sessionKeys = server.Keys(pattern: "sessions:*");

//                var activeSessions = sessionKeys
//                    .Select(key => new
//                    {
//                        SessionKey = key.ToString(),
//                        UserEmail = redisDatabase.StringGet(key) // Récupération de l'email de l'utilisateur
//                    })
//                    .ToList();

//                return Ok(activeSessions);
//            }
//            catch (Exception ex)
//            {
//                return InternalServerError(new Exception("Une erreur s'est produite lors de la récupération des sessions actives.", ex));
//            }
//        }

//        // Route DELETE: api/dynamics/logout (supprime une session spécifique)
//        [HttpDelete]
//        [Route("api/dynamics/logout")]
//        public IHttpActionResult Logout()
//        {
//            try
//            {
//                var userId = HttpContext.Current.Request.Headers["Authorization"];
//                string sessionKey = $"sessions:{userId}";

//                if (string.IsNullOrEmpty(userId) || !redisDatabase.KeyExists(sessionKey))
//                {
//                    return Unauthorized();
//                }

//                // Suppression de la session
//                redisDatabase.KeyDelete(sessionKey);

//                return Ok(new { Message = "Déconnexion réussie" });
//            }
//            catch (Exception ex)
//            {
//                return InternalServerError(new Exception("Une erreur s'est produite lors de la déconnexion.", ex));
//            }
//        }

//        [HttpGet]
//        [Route("api/dynamics/authenticate/verify-session")]
//        public IHttpActionResult VerifySession()
//        {
//            try
//            {
//                var request = HttpContext.Current.Request;
//                var userId = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];

//                if (string.IsNullOrEmpty(userId))
//                {
//                    return Ok(new { IsValid = false, Message = "Authorization header missing" });
//                }

                
//                if (!Guid.TryParse(userId, out _))
//                {
//                    return Ok(new { IsValid = false, Message = "Invalid user ID format" });
//                }

//                string sessionKey = $"sessions:{userId}";

//                // Vérifier l'existence de la clé et son expiration
//                if (!redisDatabase.KeyExists(sessionKey))
//                {
//                    return Ok(new { IsValid = false, Message = "Session expired or invalid" });
//                }

                
//                bool isAdmin = false;
//                using (var service = GetCrmService())
//                {
//                    if (service != null && service.IsReady)
//                    {
//                        var user = service.Retrieve("systemuser", new Guid(userId),
//                            new ColumnSet("cr9bc_isadmin"));

//                        if (user != null)
//                        {
//                            isAdmin = user.GetAttributeValue<bool>("cr9bc_isadmin");
//                        }
//                    }
//                }

//                // Prolonger la session si elle est valide
//                redisDatabase.KeyExpire(sessionKey, TimeSpan.FromHours(1));

//                return Ok(new
//                {
//                    IsValid = true,
//                    IsAdmin = isAdmin,
//                    Message = "Valid session"
//                });
//            }
//            catch (Exception ex)
//            {
//                return InternalServerError(new Exception("Error verifying session", ex));
//            }
//        }



//        private

//        CrmServiceClient GetCrmService()
//        {
//            try
//            {
//                return new CrmServiceClient(_connectionString);
//            }
//            catch (Exception)
//            {
//                return null;
//            }
//        }
//    }
//}