using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Http;
using ConnectDynamics_with_framework.FrontOffice.Services.Interfaces;
using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Services;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk;
using StackExchange.Redis;

namespace ConnectDynamics_with_framework.FrontOffice.Services
{
	public class Emp_CaseService : IEmp_CasesService
	{
        private readonly CrmServiceProvider _crmServiceProvider;
        private readonly IDatabase _redisDatabase;

        public Emp_CaseService(CrmServiceProvider crmServiceProvider, IDatabase redisDatabase)
        {
            _crmServiceProvider = crmServiceProvider;
            _redisDatabase = redisDatabase;
        }

        public List<CaseDto> GetMyCases()
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

                    // Ajouter une condition pour filtrer les cas assignés à l'utilisateur connecté
                    query.Criteria.AddCondition("ownerid", ConditionOperator.Equal, currentUserId);

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
                throw new Exception("Une erreur s'est produite lors de la récupération des cas de l'employé connecté.", ex);
            }
        }

        public string UpdateCaseStatus(Guid caseId, string newStatus)
        {
            var request = System.Web.HttpContext.Current.Request;
            var userIdStr = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];

            if (string.IsNullOrEmpty(userIdStr) || !_redisDatabase.KeyExists($"sessions:{userIdStr}"))
            {
                throw new HttpResponseException(HttpStatusCode.Unauthorized);
            }

            try
            {
                using (var service = _crmServiceProvider.GetService())
                {
                    if (service == null || !service.IsReady)
                    {
                        throw new Exception("La connexion à Dynamics 365 a échoué.");
                    }

                    // Récupérer le cas pour vérifier qu'il appartient bien à l'utilisateur
                    var caseEntity = service.Retrieve("incident", caseId, new ColumnSet("ownerid"));
                    var ownerRef = caseEntity.GetAttributeValue<EntityReference>("ownerid");

                    if (ownerRef == null || ownerRef.Id != new Guid(userIdStr))
                    {
                        throw new HttpResponseException(HttpStatusCode.Forbidden);
                    }

                    // Convertir le statut texte en code Dynamics
                    int statusCode = ConvertStatusToCode(newStatus);

                    // Mettre à jour l'entité
                    var entityToUpdate = new Entity("incident", caseId);
                    entityToUpdate["statuscode"] = new OptionSetValue(statusCode);
                    service.Update(entityToUpdate);

                    return $"le statut de la case (incident: {caseId} a etait modifié à {statusCode} )";
                   
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Une erreur s'est produite lors de la mise à jour du statut du cas.", ex);
            }
        }

        private int ConvertStatusToCode(string status)
        {
            switch (status.ToLower())
            {
                case "in progress": return 1;
                case "on hold": return 2;
                case "waiting for details": return 3;
                case "researching": return 4;
                default: return 1; // Par défaut "in progress"
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

        private string ConvertCustomerSatisfaction(int customersatisfactioncode)
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

        private string ConvertOriginCode(int caseorigincode)
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


    }
}