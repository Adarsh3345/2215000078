import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://20.244.56.144/evaluation-service';
const WINDOW_SIZE = 10;

const AverageCalculator = () => {
  const [results, setResults] = useState({
    manual: { windowPrevState: [], windowCurrState: [], numbers: [], avg: 0 },
    prime: { windowPrevState: [], windowCurrState: [], numbers: [], avg: 0 },
    fibo: { windowPrevState: [], windowCurrState: [], numbers: [], avg: 0 },
    even: { windowPrevState: [], windowCurrState: [], numbers: [], avg: 0 },
    random: { windowPrevState: [], windowCurrState: [], numbers: [], avg: 0 }
  });
  const [inputNumber, setInputNumber] = useState('');
  const [isLoading, setIsLoading] = useState({});
  const [error, setError] = useState(null);

  const updateWindow = useCallback((type, newNumbers) => {
    setResults(prev => {
      const currentWindow = prev[type].windowCurrState;
      
      // Filter out duplicates and maintain window size
      const uniqueNewNumbers = newNumbers.filter(n => !currentWindow.includes(n));
      let updatedNumbers = [...currentWindow, ...uniqueNewNumbers];
      
      if (updatedNumbers.length > WINDOW_SIZE) {
        updatedNumbers = updatedNumbers.slice(-WINDOW_SIZE);
      }
      
      const newAvg = updatedNumbers.reduce((a, b) => a + b, 0) / Math.min(updatedNumbers.length, WINDOW_SIZE);
      
      return {
        ...prev,
        [type]: {
          windowPrevState: currentWindow,
          windowCurrState: updatedNumbers,
          numbers: uniqueNewNumbers,
          avg: newAvg
        }
      };
    });
  }, []);

  const fetchNumbers = useCallback(async (type) => {
    setIsLoading(prev => ({ ...prev, [type]: true }));
    setError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);
      
      let endpoint;
      switch (type) {
        case 'prime': endpoint = 'primes'; break;
        case 'fibo': endpoint = 'fibo'; break;
        case 'even': endpoint = 'even'; break;
        case 'random': endpoint = 'rand'; break;
        default: return;
      }

      const response = await axios.get(`${API_BASE_URL}/${endpoint}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      updateWindow(type, response.data.numbers);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(`Failed to fetch ${type} numbers: ${err.message}`);
        console.error('Error fetching numbers:', err);
      }
    } finally {
      setIsLoading(prev => ({ ...prev, [type]: false }));
    }
  }, [updateWindow]);

  const handleAddNumber = () => {
    const num = parseInt(inputNumber);
    if (isNaN(num)) {
      setError('Please enter a valid number');
      return;
    }
    
    if (results.manual.windowCurrState.includes(num)) {
      setError('Number already exists in the current window');
      return;
    }

    updateWindow('manual', [num]);
    setInputNumber('');
    setError(null);
  };

  useEffect(() => {
    fetchNumbers('even');
  }, [fetchNumbers]);

  const renderResultBox = (type, title) => (
    <div className="result-box" key={type}>
      <h3>{title} Numbers</h3>
      {isLoading[type] ? (
        <p>Loading...</p>
      ) : (
        <pre>
          {JSON.stringify({
            windowPrevState: results[type].windowPrevState,
            windowCurrState: results[type].windowCurrState,
            numbers: results[type].numbers.length ? 
              `[${results[type].numbers.join(', ')}]` : 
              '[] // response from server',
            avg: results[type].avg.toFixed(2)
          }, null, 2)}
        </pre>
      )}
    </div>
  );

  return (
    <div className="calculator-container">
      <h1>Average Calculator</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="input-section">
        <input
          type="number"
          value={inputNumber}
          onChange={(e) => setInputNumber(e.target.value)}
          placeholder="Enter a number"
          disabled={Object.values(isLoading).some(Boolean)}
        />
        <button 
          onClick={handleAddNumber} 
          disabled={Object.values(isLoading).some(Boolean)}
        >
          Add Number
        </button>
      </div>
      
      <div className="button-section">
        <button 
          onClick={() => fetchNumbers('prime')} 
          disabled={isLoading.prime}
        >
          {isLoading.prime ? 'Loading...' : 'Prime'}
        </button>
        <button 
          onClick={() => fetchNumbers('fibo')} 
          disabled={isLoading.fibo}
        >
          {isLoading.fibo ? 'Loading...' : 'Fibonacci'}
        </button>
        <button 
          onClick={() => fetchNumbers('even')} 
          disabled={isLoading.even}
        >
          {isLoading.even ? 'Loading...' : 'Even'}
        </button>
        <button 
          onClick={() => fetchNumbers('random')} 
          disabled={isLoading.random}
        >
          {isLoading.random ? 'Loading...' : 'Random'}
        </button>
      </div>
      
      <div className="results-container">
        {renderResultBox('manual', 'Manual Input')}
        {renderResultBox('prime', 'Prime')}
        {renderResultBox('fibo', 'Fibonacci')}
        {renderResultBox('even', 'Even')}
        {renderResultBox('random', 'Random')}
      </div>
    </div>
  );
};

export default AverageCalculator;