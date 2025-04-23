using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Services.Interfaces;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Net;
using System.Web.Http;
using ConnectDynamics_with_framework.Models;
using Microsoft.Crm.Sdk.Messages;
using System.ServiceModel;
using Microsoft.AspNetCore.Http;

namespace ConnectDynamics_with_framework.Services
{
	public class CasesService : ICasesServices
    {
        private readonly CrmServiceProvider _crmServiceProvider;
        private readonly IDatabase _redisDatabase;

        public CasesService(CrmServiceProvider crmServiceProvider, IDatabase redisDatabase)
        {
            _crmServiceProvider = crmServiceProvider;
            _redisDatabase = redisDatabase;
        }

        public List<CaseDto> GetCases()
        {
            var request = System.Web.HttpContext.Current.Request;
            var userIdStr = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];

            if (string.IsNullOrEmpty(userIdStr) || !_redisDatabase.KeyExists($"sessions:{userIdStr}"))
            {
                throw new HttpResponseException(HttpStatusCode.Unauthorized); // L'utilisateur n'est pas connecté
            }

            if (!Guid.TryParse(userIdStr, out Guid currentUserId))
            {
                throw new HttpResponseException(HttpStatusCode.Unauthorized); // Identifiant utilisateur invalide
            }

            try
            {
                using (var service = _crmServiceProvider.GetService())
                {
                    if (service == null || !service.IsReady)
                    {
                        throw new Exception("La connexion à Dynamics 365 a échoué.");
                    }

                    var query = new QueryExpression("incident")
                    {
                        ColumnSet = new ColumnSet(
                            "incidentid", "ticketnumber", "title", "createdon", "casetypecode",
                            "activitiescomplete", "description", "ownerid", "prioritycode", "statuscode",
                            "caseorigincode", "customersatisfactioncode", "customerid", "modifiedon", "subjectid") 
                    };

                    var cases = service.RetrieveMultiple(query);

                    var casesList = cases.Entities.Select(c =>
                    {
                        var customerRef = c.GetAttributeValue<EntityReference>("customerid");
                        CustomerDto customerDto = null;

                        if (customerRef != null)
                        {
                            try
                            {
                                var customerEntity = service.Retrieve(customerRef.LogicalName, customerRef.Id, new ColumnSet(
                                    "name", "accountnumber", "emailaddress1", "telephone1",
                                    "address1_county", "address1_city", "description", "fax"
                                ));

                                customerDto = new CustomerDto
                                {
                                    Id = customerEntity.Id,
                                    Name = customerEntity.GetAttributeValue<string>("name"),
                                    AccountNumber = customerEntity.GetAttributeValue<string>("accountnumber"),
                                    Email = customerEntity.GetAttributeValue<string>("emailaddress1"),
                                    PhoneNumber = customerEntity.GetAttributeValue<string>("telephone1"),
                                    Country = customerEntity.GetAttributeValue<string>("address1_county"),
                                    City = customerEntity.GetAttributeValue<string>("address1_city"),
                                    Description = customerEntity.GetAttributeValue<string>("description"),
                                    Fax = customerEntity.GetAttributeValue<string>("fax"),
                                    LogicalName = customerRef.LogicalName
                                };
                            }
                            catch
                            {
                                // Gérer les cas où le client ne peut pas être récupéré
                                customerDto = null;
                            }
                        }

                        return new CaseDto
                        {
                            IncidentId = c.Id,
                            CaseNumber = c.GetAttributeValue<string>("ticketnumber"),
                            Title = c.GetAttributeValue<string>("title"),
                            CreatedOn = c.GetAttributeValue<DateTime?>("createdon"),
                            ModifiedOn = c.GetAttributeValue<DateTime?>("modifiedon"),
                            Subject = c.GetAttributeValue<EntityReference>("subjectid")?.Name,
                            CaseType = c.Contains("casetypecode") && c.GetAttributeValue<OptionSetValue>("casetypecode") != null
                                ? ConvertCaseTypeCode(c.GetAttributeValue<OptionSetValue>("casetypecode").Value)
                                : null,
                            ActivitiesComplete = c.GetAttributeValue<bool?>("activitiescomplete"),
                            Description = c.GetAttributeValue<string>("description"),
                            Owner = c.GetAttributeValue<EntityReference>("ownerid")?.Name,
                            Priority = c.Contains("prioritycode") && c.GetAttributeValue<OptionSetValue>("prioritycode") != null
                                ? ConvertPriorityCode(c.GetAttributeValue<OptionSetValue>("prioritycode").Value)
                                : null,
                            Status = c.Contains("statuscode") && c.GetAttributeValue<OptionSetValue>("statuscode") != null
                                ? ConvertStatusCode(c.GetAttributeValue<OptionSetValue>("statuscode").Value)
                                : null,
                            Origin = c.Contains("caseorigincode") && c.GetAttributeValue<OptionSetValue>("caseorigincode") != null
                                ? ConvertOriginCode(c.GetAttributeValue<OptionSetValue>("caseorigincode").Value)
                                : null,
                            Customer_satisfaction = c.Contains("customersatisfactioncode") && c.GetAttributeValue<OptionSetValue>("customersatisfactioncode") != null
                                ? ConvertCustomerSatisfaction(c.GetAttributeValue<OptionSetValue>("customersatisfactioncode").Value)
                                : null,
                            Customer = customerDto
                        };
                    }).ToList();

                    return casesList;
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Une erreur s'est produite lors de la récupération des cas.", ex);
            }
        }



        private string ConvertCaseTypeCode(int caseTypeCode)
        {
            switch (caseTypeCode)
            {
                case 1: return "question";
                case 2: return "problem";
                case 3: return "request";
                default: return null;
            }
        }

        private string ConvertPriorityCode(int priorityCode)
        {
            switch (priorityCode)
            {
                case 1: return "high";
                case 2: return "medium";
                case 3: return "low";
                default: return null;
            }
        }

        private string ConvertStatusCode(int statusCode)
        {
            switch (statusCode)
            {
                case 1: return "in progress";
                case 2: return "on hold";
                case 3: return "waiting for details";
                case 4: return "researching";
                default: return "in progress";
            }
        }

        private string ConvertCustomerSatisfaction( int customersatisfactioncode)
        {
            switch (customersatisfactioncode)
            {
                case 1: return "Very Dissatisfied";
                case 2: return "Dissatisfied";
                case 3: return "Neutral";
                case 4: return "Satisfied";
                case 5: return "Very Satisfied";
                default: return "N/A";
            }
        }

        private string ConvertOriginCode (int caseorigincode)
        {
            switch (caseorigincode)
            {
                case 1: return "Phone";
                case 2: return "Email";
                case 3: return "Web";
                case 2483: return "Facebook";
                case 3986: return "Twitter";
                case 700610000: return "IoT";
                default: return "Phone";



            }
        }

        public string AssignCaseToUser(AssignCaseModel requestModel)
        {
            var request = System.Web.HttpContext.Current.Request;
            var userIdHeader = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];
            string sessionKey = $"sessions:{userIdHeader}";

            if (string.IsNullOrEmpty(userIdHeader) || !_redisDatabase.KeyExists(sessionKey))
            {
                throw new HttpResponseException(HttpStatusCode.Unauthorized);
            }

            if (requestModel == null || requestModel.CaseId == Guid.Empty || requestModel.UserId == Guid.Empty)
            {
                throw new HttpResponseException(HttpStatusCode.BadRequest);
            }

            try
            {
                using (var service = _crmServiceProvider.GetService())
                {
                    if (service == null || !service.IsReady)
                    {
                        throw new Exception("La connexion à Dynamics 365 a échoué.");
                    }

                    // Récupérer le nom du case
                    var incident = service.Retrieve("incident", requestModel.CaseId, new ColumnSet("title"));
                    string caseTitle = incident.GetAttributeValue<string>("title") ?? "Inconnu";

                    // Récupérer le nom de l'utilisateur
                    var user = service.Retrieve("systemuser", requestModel.UserId, new ColumnSet("fullname"));
                    string userName = user.GetAttributeValue<string>("fullname") ?? "Utilisateur inconnu";

                    // Effectuer l'assignation
                    var assignRequest = new AssignRequest
                    {
                        Assignee = new EntityReference("systemuser", requestModel.UserId),
                        Target = new EntityReference("incident", requestModel.CaseId)
                    };

                    service.Execute(assignRequest);

                    return $"Case : {caseTitle} est bien assignée à : {userName}.";
                }
            }
            catch (FaultException<OrganizationServiceFault> faultEx)
            {
                var errorMessage = faultEx.Detail != null ? faultEx.Detail.Message : faultEx.Message;
                throw new Exception("Erreur CRM : " + errorMessage, faultEx);
            }
            catch (Exception ex)
            {
                throw new Exception("Erreur inconnue lors de l’assignation de la case.", ex);
            }
        }

        public string UpdateCase(CaseDto requestModel)
        {
            var request = System.Web.HttpContext.Current.Request;
            var userIdHeader = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];
            string sessionKey = $"sessions:{userIdHeader}";

            if (string.IsNullOrEmpty(userIdHeader) || !_redisDatabase.KeyExists(sessionKey))
            {
                throw new HttpResponseException(HttpStatusCode.Unauthorized);
            }

            if (requestModel == null || requestModel.IncidentId == Guid.Empty)
            {
                throw new HttpResponseException(HttpStatusCode.BadRequest);
            }

            try
            {
                using (var service = _crmServiceProvider.GetService())
                {
                    if (service == null || !service.IsReady)
                    {
                        throw new Exception("La connexion à Dynamics 365 a échoué.");
                    }

                    
                    var incident = service.Retrieve("incident", requestModel.IncidentId, new ColumnSet(true));

                   
                    if (!string.IsNullOrEmpty(requestModel.Title))
                        incident["title"] = requestModel.Title;

                    if (!string.IsNullOrEmpty(requestModel.Description))
                        incident["description"] = requestModel.Description;

                    if (!string.IsNullOrEmpty(requestModel.CaseType))
                        incident["casetypecode"] = new OptionSetValue(ConvertCaseTypeCodeInverse(requestModel.CaseType));  // Conversion en OptionSetValue

                    if (!string.IsNullOrEmpty(requestModel.Priority))
                        incident["prioritycode"] = new OptionSetValue(ConvertPriorityCodeInverse(requestModel.Priority)); // Conversion en OptionSetValue

                    if (!string.IsNullOrEmpty(requestModel.Status))
                        incident["statuscode"] = new OptionSetValue(ConvertStatusCodeInverse(requestModel.Status)); // Conversion en OptionSetValue

                    if (requestModel.ActivitiesComplete.HasValue)
                        incident["activitiescomplete"] = requestModel.ActivitiesComplete.Value;

                    
                    if (!string.IsNullOrEmpty(requestModel.Owner))
                    {
                        if (Guid.TryParse(requestModel.Owner, out Guid ownerGuid))
                        {
                            incident["ownerid"] = new EntityReference("systemuser", ownerGuid);
                        }
                    }

                    service.Update(incident);

                    return $"Le case (IncidentId: {requestModel.IncidentId}) a été mis à jour avec succès.";
                }
            }
            catch (FaultException<OrganizationServiceFault> faultEx)
            {
                var errorMessage = faultEx.Detail != null ? faultEx.Detail.Message : faultEx.Message;
                throw new Exception("Erreur CRM : " + errorMessage, faultEx);
            }
            catch (Exception ex)
            {
                throw new Exception("Une erreur s'est produite lors de la mise à jour de la case.", ex);
            }
        }

        private int ConvertCaseTypeCodeInverse (string caseType)
        {
            switch (caseType.ToLower())
            {
                case "question":
                    return 1;  
                case "problem":
                    return 2; 
                case "request":
                    return 3;  
                default:
                    throw new ArgumentException("Valeur invalide pour CaseType.");
            }
        }

        private int ConvertPriorityCodeInverse(string priority)
        {
            switch (priority.ToLower())
            {
                case "high":
                    return 1;  
                case "medium":
                    return 2;  
                case "low":
                    return 3;  
                default:
                    throw new ArgumentException("Valeur invalide pour Priority.");
            }
        }

        private int ConvertStatusCodeInverse(string status)
        {
            switch (status.ToLower())
            {
                case "in progress":
                    return 1;  
                case "on hold":
                    return 2;  
                case "waiting for details":
                    return 3;  
                case "researching":
                    return 4; 
                default:
                    throw new ArgumentException("Valeur invalide pour Status.");
            }
        }

    }
}