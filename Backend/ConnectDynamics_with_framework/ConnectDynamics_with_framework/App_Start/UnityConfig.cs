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
        // Ajout d'une variable statique pour stocker le container
        private static UnityContainer _container;

        // Nouvelle méthode pour accéder au container configuré
        public static UnityContainer GetConfiguredContainer()
        {
            if (_container == null)
            {
                RegisterComponents();
            }
            return _container;
        }

        public static void RegisterComponents()
        {
            // Utiliser la variable statique au lieu d'une variable locale
            _container = new UnityContainer();

            // Redis connection
            var redis = ConnectionMultiplexer.Connect("localhost"); // change to match your setup
            var db = redis.GetDatabase();
            _container.RegisterInstance<IDatabase>(db);

            // Register services
            _container.RegisterType<CrmServiceProvider>(new ContainerControlledLifetimeManager());
            _container.RegisterType<IAuthService, AuthService>();
            _container.RegisterType<ISessionService, SessionService>();
            _container.RegisterType<IEmployeesService, EmployeesService>();
            _container.RegisterType<IActivitiesService, ActivitiesService>();
            _container.RegisterType<ICasesServices, CasesService>();
            _container.RegisterType<IEmp_CasesService, Emp_CaseService>();
            _container.RegisterType<IProfileService, ProfileService>();
            _container.RegisterType<IChatService, ChatService>();

            GlobalConfiguration.Configuration.DependencyResolver = new UnityDependencyResolver(_container);
        }
    }
}
