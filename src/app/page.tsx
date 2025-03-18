"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import logo from "../../public/logo.svg";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "./store/store";

const page = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const branding = useSelector((state: RootState) => state.branding);

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/auth/login");
      }
    }
  }, [user, loading]);

  return (
    <div className="container">
      <div
        className="row"
        style={{
          display: "flex",
          height: "100vh",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div className="col">
          <Image
            src={branding.logo}
            alt="BIGTIFY PASS"
            width={100}
            height={48}
            priority
          />
          <span className="text-xl font-bold">{branding.companyName}</span>
        </div>
      </div>
    </div>
  );
};

export default page;
