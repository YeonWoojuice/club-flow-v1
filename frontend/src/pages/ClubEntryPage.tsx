import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listClubs } from "../api/clubs";
import { LoadingScreen } from "../components/LoadingScreen";

export function ClubEntryPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("접근 가능한 동아리를 확인하고 있습니다.");

  useEffect(() => {
    listClubs()
      .then(clubs => {
        if (clubs.length === 0) {
          navigate("/clubs/new", { replace: true });
          return;
        }
        if (clubs.length === 1) {
          navigate(`/clubs/${clubs[0].id}/dashboard`, { replace: true });
          return;
        }
        navigate("/clubs", { replace: true });
      })
      .catch(() => setMessage("동아리 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."));
  }, [navigate]);

  return <LoadingScreen message={message} />;
}
