export namespace models {
	
	export class Advance {
	    id: number;
	    userId: number;
	    date: string;
	    amount: number;
	    note: string;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Advance(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.date = source["date"];
	        this.amount = source["amount"];
	        this.note = source["note"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class Attendance {
	    id: number;
	    userId: number;
	    date: string;
	    coefficient: number;
	    worksiteId?: number;
	    note: string;
	    createdAt: string;
	    worksiteName?: string;
	    salary?: number;
	
	    static createFrom(source: any = {}) {
	        return new Attendance(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.date = source["date"];
	        this.coefficient = source["coefficient"];
	        this.worksiteId = source["worksiteId"];
	        this.note = source["note"];
	        this.createdAt = source["createdAt"];
	        this.worksiteName = source["worksiteName"];
	        this.salary = source["salary"];
	    }
	}
	export class AuditLog {
	    id: number;
	    action: string;
	    target: string;
	    targetId: number;
	    details: string;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new AuditLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.action = source["action"];
	        this.target = source["target"];
	        this.targetId = source["targetId"];
	        this.details = source["details"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class MonthSummary {
	    totalDays: number;
	    totalCoefficient: number;
	    totalSalary: number;
	    totalAdvances: number;
	    netSalary: number;
	
	    static createFrom(source: any = {}) {
	        return new MonthSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalDays = source["totalDays"];
	        this.totalCoefficient = source["totalCoefficient"];
	        this.totalSalary = source["totalSalary"];
	        this.totalAdvances = source["totalAdvances"];
	        this.netSalary = source["netSalary"];
	    }
	}
	export class User {
	    id: number;
	    name: string;
	    dailyWage: number;
	    isSelf: boolean;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new User(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.dailyWage = source["dailyWage"];
	        this.isSelf = source["isSelf"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class Worksite {
	    id: number;
	    name: string;
	    dailyWage: number;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Worksite(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.dailyWage = source["dailyWage"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class WorksiteSummary {
	    worksiteId?: number;
	    worksiteName: string;
	    dailyWage: number;
	    totalCoeff: number;
	    totalSalary: number;
	
	    static createFrom(source: any = {}) {
	        return new WorksiteSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.worksiteId = source["worksiteId"];
	        this.worksiteName = source["worksiteName"];
	        this.dailyWage = source["dailyWage"];
	        this.totalCoeff = source["totalCoeff"];
	        this.totalSalary = source["totalSalary"];
	    }
	}

}

