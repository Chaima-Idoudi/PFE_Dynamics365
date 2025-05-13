using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.Cors;

namespace ConnectDynamics_with_framework.Controllers
{
    [EnableCors(origins: "http://localhost:4200", headers: "*", methods: "*")]
    [RoutePrefix("api/dynamics")]
    public class EmployeesController : ApiController
    {
        private readonly IEmployeesService _employeesService;

        public EmployeesController(IEmployeesService employeesService)
        {
            _employeesService = employeesService;
        }

        [HttpGet]
        [Route("employees")]
        public IHttpActionResult GetEmployees()
        {
            try
            {
                var employees = _employeesService.GetEmployees();
                return Ok(employees);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Une erreur s'est produite lors de la récupération des employés.", ex));
            }
        }

        [HttpGet]
        [Route("techniciens")]
        public IHttpActionResult GetTechniciens()
        {
            try
            {
                var employees = _employeesService.GetTechniciens();
                return Ok(employees);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception("Une erreur s'est produite lors de la récupération des techniciens.", ex));
            }
        }
    }
}
