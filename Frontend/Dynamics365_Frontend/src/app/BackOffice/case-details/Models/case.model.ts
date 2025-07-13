export interface Case {
    IncidentId: string;
    Stage?: string;
    Note?: string;
    Title?: string;
    CaseNumber?: string;
    Status?: string;
    Priority?: string| null;
    CreatedOn?: Date | string;
    Description?: string;
    Subject?: string;
    ActivitiesComplete?: boolean;
    CaseType?: string;
    Origin?: string;
    Owner?: string;
    ModifiedOn?: Date | string;
    Customer_satisfaction?: string;
    Customer?: {
      Name?: string;
      AccountNumber?: string;
      Email?: string;
      PhoneNumber?: string;
      Fax?: string;
      LogicalName?: string;
      
    };
    
  }