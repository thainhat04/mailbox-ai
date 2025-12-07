import { ApiProperty } from "@nestjs/swagger";

export class SendEmailResponse {
  @ApiProperty({
    description: "ID của email vừa gửi (Message-ID)",
    example: "174fd8d3c9@mail.gmail.com",
  })
  emailId: string;

  @ApiProperty({
    description: "Thời điểm gửi email thành công",
    example: "2025-11-30T13:15:22.000Z",
  })
  sendAt: Date;

  @ApiProperty()
  labelId?: string[];
}
