using ConnectDynamics_with_framework.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ConnectDynamics_with_framework.Services.Interfaces
{
    public interface IActivitiesService
    {
        List<ActivityDto> getActivities();
    }
}
