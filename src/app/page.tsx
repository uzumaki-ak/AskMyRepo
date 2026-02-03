import Link from "next/link";
import { Button } from "~/components/ui/button";

export default async function Home() {
  return (
    <Link href="/dashboard" className="text-red-400">
      hey sop
    </Link>
  );
}
