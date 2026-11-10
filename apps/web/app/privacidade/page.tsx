import Link from 'next/link';
import { ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        
        {/* Botão de Voltar */}
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 mb-6 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Voltar para o início
        </Link>

        {/* Título */}
        <div className="flex items-center gap-3 mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
          <ShieldCheckIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Política de Privacidade
          </h1>
        </div>

        {/* Texto */}
        <div className="prose prose-blue dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-6">
          <p>
            A sua privacidade é importante para nós. É política do <strong>DevLife (Listapday)</strong> respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site <a href="https://www.listapday.com.br" className="text-blue-600 hover:underline">listapday.com.br</a> e em nossos aplicativos móveis.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">1. Coleta de Dados</h2>
          <p>
            Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. 
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Dados de Cadastro:</strong> Nome, e-mail e senha (criptografada).</li>
            <li><strong>Dados de Uso:</strong> Tarefas, notas, categorias e horários criados por você.</li>
            <li><strong>Dados de Integração (WhatsApp):</strong> Caso você ative as notificações, armazenamos seu número de telefone apenas para o envio dos alertas de tarefas.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">2. Uso das Informações</h2>
          <p>
            A coleta e o uso das informações são feitos para:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Fornecer, operar e manter nosso serviço;</li>
            <li>Melhorar, personalizar e expandir nossa plataforma;</li>
            <li>Entender e analisar como você usa nosso aplicativo;</li>
            <li>Desenvolver novos produtos, serviços, recursos e funcionalidades;</li>
            <li>Enviar notificações de lembretes de tarefas (via sistema, e-mail ou WhatsApp).</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">3. Compartilhamento de Dados</h2>
          <p>
            Não compartilhamos suas informações pessoais com terceiros, exceto com os provedores essenciais para o funcionamento do sistema (como a API oficial do WhatsApp/Meta para envio de lembretes). Não vendemos seus dados para empresas de publicidade.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">4. Seus Direitos (LGPD)</h2>
          <p>
            De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de acessar, corrigir, excluir ou portar suas informações a qualquer momento. Você pode gerenciar suas informações diretamente no painel do aplicativo ou solicitar a exclusão total da conta entrando em contato conosco.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">5. Segurança</h2>
          <p>
            Os dados são armazenados em servidores seguros e as senhas são criptografadas. No entanto, nenhum método de transmissão pela internet ou armazenamento eletrônico é 100% seguro, e não podemos garantir segurança absoluta.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">6. Contato</h2>
          <p>
            Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contato pelo e-mail: <strong>contato@listapday.com.br</strong>.
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
            Esta política é efetiva a partir de Outubro de 2026 e pode ser atualizada periodicamente.
          </p>
        </div>
      </div>
    </div>
  );
}