import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import ImportForm from "@/components/ImportForm";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">엑셀 임포트</h1>
          <p className="mt-1 text-sm text-gray-600">
            마스터 엑셀 파일을 업로드해 제품/프로세스를 대량 반영합니다. Preview로
            영향을 미리 확인한 뒤 Commit 하세요.
          </p>
        </div>
        <ImportForm />
      </main>
    </>
  );
}
