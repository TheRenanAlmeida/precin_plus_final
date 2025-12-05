import React, { useState, useEffect } from 'react';

const RealTimeClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDateTime = new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Sao_Paulo',
    hour12: false
  }).format(currentTime);

  return (
    <div className="text-right">
      <p className="font-semibold text-sm text-gray-700 tabular-nums">{formattedDateTime.replace(',', '')}</p>
      <p className="text-xs text-gray-500">Horário de Brasília</p>
    </div>
  );
};

export default RealTimeClock;
