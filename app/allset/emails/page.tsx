'use client'

import { useEffect, useState } from 'react'
import type { EmailRecord } from '@/types/email'
import { emailTemplates } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/client'

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailRecord[]>([])
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof emailTemplates>('welcome')
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchEmails = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/allset/emails')
        if (!res.ok) throw new Error('Failed to fetch emails')
        const data = await res.json()
        setEmails(data.emails)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchEmails()
  }, [])

  const handleEmailToggle = (email: string) => {
    const newSelected = new Set(selectedEmails)
    if (newSelected.has(email)) {
      newSelected.delete(email)
    } else {
      newSelected.add(email)
    }
    setSelectedEmails(newSelected)
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedEmails(new Set(emails.map((e) => e.email)))
    } else {
      setSelectedEmails(new Set())
    }
  }

  const handleSendEmails = async () => {
    if (selectedEmails.size === 0) {
      setMessage({ text: 'Please select at least one email', type: 'error' })
      return
    }

    setIsSending(true)
    setMessage(null)

    try {
      const results = await Promise.allSettled(
        Array.from(selectedEmails).map((email) =>
          sendEmail({
            to: email,
            subject: `Your ${selectedTemplate} email`,
            template: selectedTemplate,
            data: {
              name: email.split('@')[0],
              welcomeMessage: `This is a test ${selectedTemplate} email`,
              ctaUrl: 'https://example.com',
              ctaText: 'Learn More',
            },
          })
        )
      )

      const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length
      const errorCount = results.length - successCount

      if (errorCount > 0) {
        setMessage({
          text: `Sent ${successCount} emails, failed to send ${errorCount} emails`,
          type: errorCount === results.length ? 'error' : 'success',
        })
      } else {
        setMessage({
          text: `Successfully sent ${successCount} emails`,
          type: 'success',
        })
      }
    } catch (error) {
      console.error('Error sending emails:', error)
      setMessage({
        text: error instanceof Error ? error.message : 'Failed to send emails',
        type: 'error',
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold dark:text-white">Email Subscribers</h1>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value as keyof typeof emailTemplates)}
            className="rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            disabled={isSending}
          >
            {Object.entries(emailTemplates).map(([key, value]) => (
              <option key={key} value={key}>
                {key.replace('-', ' ')}
              </option>
            ))}
          </select>
          <button
            onClick={handleSendEmails}
            disabled={isSending || selectedEmails.size === 0}
            className={`rounded-md px-4 py-2 text-white ${
              isSending || selectedEmails.size === 0
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSending ? 'Sending...' : `Send to ${selectedEmails.size} selected`}
          </button>
        </div>
      </div>
      {message && (
        <div
          className={`mb-4 rounded-md p-4 ${
            message.type === 'error'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          }`}
        >
          {message.text}
        </div>
      )}
      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
      ) : error ? (
        <div className="text-center text-red-600 dark:text-red-400">{error}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-900">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    checked={selectedEmails.size > 0 && selectedEmails.size === emails.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase dark:text-gray-300">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase dark:text-gray-300">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase dark:text-gray-300">
                  Subscribed At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {emails.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400 dark:text-gray-600">
                    No emails found.
                  </td>
                </tr>
              ) : (
                emails.map((email) => (
                  <tr key={email.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                        checked={selectedEmails.has(email.email)}
                        onChange={() => handleEmailToggle(email.email)}
                      />
                    </td>
                    <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {email.id}
                    </td>
                    <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {email.email}
                    </td>
                    <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {new Date(email.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
