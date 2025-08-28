using ConnectDynamics_with_framework.FrontOffice.Models;
using ConnectDynamics_with_framework.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ConnectDynamics_with_framework.FrontOffice.Services.Interfaces
{
    public interface IEmp_CasesService
    {
        List<CaseDto> GetMyCases();
        
        string UpdateCaseStage(Guid caseId, string newStatus);
        string UpdateCaseNote(Guid caseId, string newNote);

        //void ValidateUserAndCaseOwnership(Guid caseId);
        string UpdateCaseImage(Guid caseId, byte[] imageData);
        string UpdateCaseImages(Guid caseId, List<ImageFileDto> images);

        CaseDto GetCaseDetails(Guid caseId);
        void ValidateUserAndCaseOwnership(Guid caseId);

        string DeleteCaseImage(Guid caseId, string fileName);

        string UpdateCaseStageWithReason(Guid caseId, string newStatus, string cancellationReason);

    }
}
