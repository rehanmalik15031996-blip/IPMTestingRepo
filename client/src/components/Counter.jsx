import React, { useState, useEffect } from 'react';

const Counter = ({ target }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    // Calculate how much to increase based on the target number
    const increment = target / 100;
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.ceil(start));
      }
    }, 20); // This 20ms speed matches your script.js logic

    return () => clearInterval(timer);
  }, [target]);

  return <h2 className="counter">{count}%</h2>;
};

export default Counter;