import { describe,expect,it } from "vitest";
import { safeNextPath, isProtectedAppPath } from "./navigation";
describe("return-to navigation",()=>{
 it.each([null,"","//external.test","https://external.test","javascript:alert(1)","/\\external.test","/%2fexternal.test","/\n/external.test"])("rejects unsafe target %s",target=>expect(safeNextPath(target)).toBe("/dashboard"));
 it("preserves local paths, queries and anchors",()=>expect(safeNextPath("/review-lab?tab=history#session")).toBe("/review-lab?tab=history#session"));
});

describe("private page classification",()=>{
 it.each(["/recovery","/coach/workout","/review-lab/session-1","/onboarding"])("protects %s",path=>expect(isProtectedAppPath(path)).toBe(true));
 it.each(["/","/login","/signup","/sign-in","/review-lab/methodology","/recovery-tips"])("keeps %s public",path=>expect(isProtectedAppPath(path)).toBe(false));
});
