import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        ordersCount: true,
        totalSpent: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        orders: { orderBy: { createdAt: "desc" }, take: 20 },
        loyaltyAccount: true,
        addresses: true,
      },
    });
    if (!customer) throw new NotFoundException("Client introuvable");
    const { passwordHash: _omit, ...rest } = customer;
    return rest;
  }
}
