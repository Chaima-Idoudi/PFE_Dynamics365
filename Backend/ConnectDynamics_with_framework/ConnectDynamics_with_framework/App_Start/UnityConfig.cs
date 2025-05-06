using ConnectDynamics_with_framework.Interfaces;
using ConnectDynamics_with_framework.Services;
using ConnectDynamics_with_framework.Services.Interfaces;
using ConnectDynamics_with_framework.FrontOffice.Services.Interfaces;
using Microsoft.Practices.Unity;
using StackExchange.Redis;
using System.Web.Http;
using Unity;
using Unity.AspNet.WebApi;
using Unity.Lifetime;
using ConnectDynamics_with_framework.FrontOffice.Services;

namespace ConnectDynamics_with_framework.App_Start
{
    public static class UnityConfig
    {
        public static void RegisterComponents()
        {
            var container = new UnityContainer();

            // Redis connection
            var redis = ConnectionMultiplexer.Connect("localhost"); // change to match your setup
            var db = redis.GetDatabase();
            container.RegisterInstance<IDatabase>(db);

            // Register other services
            container.RegisterType<CrmServiceProvider>(new ContainerControlledLifetimeManager());
            container.RegisterType<IAuthService, AuthService>();
            container.RegisterType<ISessionService, SessionService>();
            container.RegisterType<IEmployeesService, EmployeesService>();
            container.RegisterType<IActivitiesService, ActivitiesService>();
            container.RegisterType<ICasesServices, CasesService>();
            container.RegisterType<IEmp_CasesService, Emp_CaseService>();
            //container.RegisterType<IProfileService, ProfileService>();
            container.RegisterType<IProfileService, ProfileService>();

            GlobalConfiguration.Configuration.DependencyResolver = new UnityDependencyResolver(container);
        }
    }
}
