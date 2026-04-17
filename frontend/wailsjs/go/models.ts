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
	export class BulkCreateResult {
	    created: User[];
	    skipped: string[];
	
	    static createFrom(source: any = {}) {
	        return new BulkCreateResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.created = this.convertValues(source["created"], User);
	        this.skipped = source["skipped"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CellRef {
	    userId: number;
	    date: string;
	
	    static createFrom(source: any = {}) {
	        return new CellRef(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.userId = source["userId"];
	        this.date = source["date"];
	    }
	}
	export class DayNote {
	    yearMonth: string;
	    day: number;
	    note: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new DayNote(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.yearMonth = source["yearMonth"];
	        this.day = source["day"];
	        this.note = source["note"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class MatrixCell {
	    attendanceId: number;
	    coefficient: number;
	    worksiteId?: number;
	    worksiteName: string;
	    note: string;
	
	    static createFrom(source: any = {}) {
	        return new MatrixCell(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.attendanceId = source["attendanceId"];
	        this.coefficient = source["coefficient"];
	        this.worksiteId = source["worksiteId"];
	        this.worksiteName = source["worksiteName"];
	        this.note = source["note"];
	    }
	}
	export class MatrixRow {
	    userId: number;
	    userName: string;
	    cells: Record<number, MatrixCell>;
	    totalDays: number;
	    totalCoef: number;
	    salary: number;
	
	    static createFrom(source: any = {}) {
	        return new MatrixRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.userId = source["userId"];
	        this.userName = source["userName"];
	        this.cells = this.convertValues(source["cells"], MatrixCell, true);
	        this.totalDays = source["totalDays"];
	        this.totalCoef = source["totalCoef"];
	        this.salary = source["salary"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MonthSummary {
	    totalDays: number;
	    totalCoefficient: number;
	    totalSalary: number;
	    totalAdvances: number;
	    netSalary: number;
	    paidDays: number;
	    paidCoefficient: number;
	    unpaidDays: number;
	    unpaidCoefficient: number;
	
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
	        this.paidDays = source["paidDays"];
	        this.paidCoefficient = source["paidCoefficient"];
	        this.unpaidDays = source["unpaidDays"];
	        this.unpaidCoefficient = source["unpaidCoefficient"];
	    }
	}
	export class TeamMatrix {
	    yearMonth: string;
	    daysInMonth: number;
	    rows: MatrixRow[];
	    dayNotes: Record<number, string>;
	    dayTotals: Record<number, number>;
	
	    static createFrom(source: any = {}) {
	        return new TeamMatrix(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.yearMonth = source["yearMonth"];
	        this.daysInMonth = source["daysInMonth"];
	        this.rows = this.convertValues(source["rows"], MatrixRow);
	        this.dayNotes = source["dayNotes"];
	        this.dayTotals = source["dayTotals"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
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

