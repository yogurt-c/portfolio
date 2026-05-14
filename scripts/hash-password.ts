// Makefile 의 'admin-pw' 타깃에서 호출됨.
// ADMIN_PW 환경변수에 비밀번호를 받아 bcrypt 해시를 stdout 으로 출력.
import bcrypt from "bcryptjs";

const pw = process.env.ADMIN_PW;
if (!pw) {
  console.error("ADMIN_PW 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}
const hash = bcrypt.hashSync(pw, 12);
console.log(hash);
