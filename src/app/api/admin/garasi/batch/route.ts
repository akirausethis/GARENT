import { NextRequest } from "next/server";
import { POST as handleBatchPost } from "../route";

export async function POST(req: NextRequest) {
  return handleBatchPost(req);
}
